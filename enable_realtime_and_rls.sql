-- ==============================================================================
-- สคริปต์เปิดใช้งานระบบ REAL-TIME ทันทีข้ามทุกอุปกรณ์ และสิทธิ์ RLS สำหรับ Hug Dee Home
-- สามารถคัดลอกทั้งหมดนี้ไปวางในเมนู SQL Editor ของ Supabase แล้วกด "Run" ได้ทันที
-- ==============================================================================

-- 1. เพิ่มคอลัมน์สำหรับการเปิดใช้งานและบันทึกประวัติ (ถ้ายังไม่มี)
ALTER TABLE IF EXISTS public.patients ADD COLUMN IF NOT EXISTS activated_by TEXT;
ALTER TABLE IF EXISTS public.patients ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- 2. ตั้งค่า REPLICA IDENTITY FULL ให้กับทุกตาราง
-- เพื่อให้เมื่อมีการ UPDATE หรือ DELETE ทาง Supabase Realtime จะส่งค่า ID เดิมกลับมาให้ทุกเครื่องลบ/อัปเดตตรงกันทันที
ALTER TABLE IF EXISTS public.patients REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.appointments REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.receipts REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.referrals REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.opd_records REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.assessments REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.transactions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.promotions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.rewards REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.holidays REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.users REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.therapists REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.services REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.assessment_templates REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.attendance REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.payrolls REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.clinic_info REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.salary_rules REPLICA IDENTITY FULL;

-- 3. เพิ่มทุกตารางเข้าสู่ Supabase Realtime Publication
DO $$
DECLARE
  tbl_name text;
  tables_to_add text[] := ARRAY[
    'patients', 'appointments', 'receipts', 'referrals', 'opd_records', 
    'assessments', 'transactions', 'promotions', 'rewards', 'bank_accounts', 
    'holidays', 'users', 'therapists', 'services', 'assessment_templates', 
    'attendance', 'payrolls', 'clinic_info', 'salary_rules'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables_to_add
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl_name);
      RAISE NOTICE 'Added table % to supabase_realtime publication.', tbl_name;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Table % is already in supabase_realtime publication.', tbl_name;
      WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist yet. Skipping.', tbl_name;
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not add table %: %', tbl_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- 4. ตั้งค่า RLS (Row Level Security) สำหรับตาราง patients
-- อนุญาตให้ผู้ปกครอง (Guest / Anon) ส่งแบบฟอร์มลงทะเบียนสถานะ Pending ได้อย่างปลอดภัย
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert pending patients" ON public.patients;
CREATE POLICY "Allow anon insert pending patients" ON public.patients
FOR INSERT TO anon WITH CHECK (status = 'Pending');

DROP POLICY IF EXISTS "Allow anon select patients" ON public.patients;
CREATE POLICY "Allow anon select patients" ON public.patients
FOR SELECT TO anon USING (status = 'Pending');

DROP POLICY IF EXISTS "Allow authenticated full access to patients" ON public.patients;
CREATE POLICY "Allow authenticated full access to patients" ON public.patients
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. ฟังก์ชันสร้างเลขรหัสรออนุมัติชั่วคราว (PND-XXXXXX)
CREATE OR REPLACE FUNCTION get_next_pending_patient_hn()
RETURNS TEXT
SECURITY DEFINER AS $$
DECLARE
  rand_suffix TEXT;
BEGIN
  rand_suffix := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
  RETURN 'PND-' || rand_suffix;
END;
$$ LANGUAGE plpgsql;

-- 6. RPC Function สำหรับรับข้อมูลลงทะเบียนจากผู้ปกครองทางออนไลน์
CREATE OR REPLACE FUNCTION submit_patient_registration(
  p_title TEXT,
  p_firstname TEXT,
  p_lastname TEXT,
  p_nickname TEXT,
  p_gender TEXT,
  p_dob TEXT,
  p_guardian TEXT,
  p_phone TEXT,
  p_allergies TEXT,
  p_allergies_details TEXT,
  p_conditions TEXT,
  p_conditions_details TEXT,
  p_channels TEXT,
  p_channels_other_details TEXT,
  p_worries TEXT
)
RETURNS JSONB
SECURITY DEFINER AS $$
DECLARE
  new_pending_hn TEXT;
BEGIN
  LOOP
    new_pending_hn := get_next_pending_patient_hn();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.patients WHERE hn = new_pending_hn);
  END LOOP;

  INSERT INTO public.patients (
    hn,
    title,
    firstname,
    lastname,
    nickname,
    gender,
    dob,
    guardian,
    phone,
    status,
    allergies,
    allergies_details,
    conditions,
    conditions_details,
    channels,
    channels_other_details,
    worries,
    created_at,
    created_by
  ) VALUES (
    new_pending_hn,
    p_title,
    TRIM(p_firstname),
    TRIM(p_lastname),
    TRIM(p_nickname),
    p_gender,
    p_dob,
    TRIM(p_guardian),
    TRIM(p_phone),
    'Pending',
    p_allergies,
    p_allergies_details,
    p_conditions,
    p_conditions_details,
    p_channels,
    p_channels_other_details,
    p_worries,
    NOW(),
    'ผู้ปกครอง (ลงทะเบียนออนไลน์)'
  );

  RETURN jsonb_build_object('hn', new_pending_hn, 'status', 'Pending');
END;
$$ LANGUAGE plpgsql;

-- 7. มอบสิทธิ์การใช้งาน RPC ให้กับผู้ใช้ทั่วไป (anon) และเจ้าหน้าที่ (authenticated)
GRANT EXECUTE ON FUNCTION get_next_pending_patient_hn() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_patient_registration(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
