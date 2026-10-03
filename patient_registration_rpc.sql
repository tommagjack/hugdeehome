-- SQL Script for Anonymous Parent Patient Registration via Supabase RPC
-- Allows parents to securely submit registration intake forms from web / mobile
-- and saves with status 'Pending' for clinic staff verification and HN assignment.

-- 1. Ensure columns exist on public.patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS activated_by TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- 2. Create function to generate a temporary pending HN
CREATE OR REPLACE FUNCTION get_next_pending_patient_hn()
RETURNS TEXT
SECURITY DEFINER AS $$
DECLARE
  rand_suffix TEXT;
BEGIN
  -- Generate 6 digit random number
  rand_suffix := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
  RETURN 'PND-' || rand_suffix;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to submit patient registration anonymously
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
  -- Generate unique pending HN
  LOOP
    new_pending_hn := get_next_pending_patient_hn();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.patients WHERE hn = new_pending_hn);
  END LOOP;

  -- Insert into public.patients with status 'Pending'
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
    'ลงทะเบียนออนไลน์ผ่านแบบฟอร์ม'
  );

  RETURN jsonb_build_object('hn', new_pending_hn, 'status', 'Pending');
END;
$$ LANGUAGE plpgsql;

-- 4. Grant execute permissions to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION get_next_pending_patient_hn() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_patient_registration(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
