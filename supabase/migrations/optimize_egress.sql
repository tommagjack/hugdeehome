-- ==============================================================================
-- SQL Optimization Script for Supabase Free Plan (Hug Dee Home)
-- Script: optimize_egress.sql
-- คำแนะนำ: สามารถนำสคริปต์นี้ไปเปิดใน Supabase Dashboard -> SQL Editor แล้วกด Run
-- เพื่อเพิ่ม Index เพิ่มประสิทธิภาพการค้นหา และลดเวลาในการประมวลผลข้อมูลของฐานข้อมูล
-- ==============================================================================

-- 1. สร้างตาราง itp_goals (เป้าหมายบำบัด ITP) หากยังไม่เคยถูกสร้างบน Supabase
CREATE TABLE IF NOT EXISTS public.itp_goals (
  id TEXT PRIMARY KEY,
  hn TEXT,
  therapist TEXT,
  title TEXT,
  category TEXT,
  target_date TEXT,
  status TEXT,
  progress NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- เปิด RLS และสิทธิ์การเข้าถึงสำหรับ itp_goals
ALTER TABLE public.itp_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access to itp_goals" ON public.itp_goals;
CREATE POLICY "Allow authenticated full access to itp_goals" ON public.itp_goals
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. สร้าง Index แบบปลอดภัย 100% (ตรวจสอบการมีอยู่ของตารางก่อนสร้าง ป้องกัน Error 42P01)
DO $$
BEGIN
  -- Index สำหรับการค้นหาคนไข้และผู้ปกครอง (patients)
  IF to_regclass('public.patients') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
    CREATE INDEX IF NOT EXISTS idx_patients_line_user_id ON public.patients(line_user_id);
    CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);
  END IF;

  -- Index สำหรับการค้นหาพนักงานและการผูก LINE User ID (users)
  IF to_regclass('public.users') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON public.users(line_user_id);
    CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users(employee_id);
    CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users(role, status);
  END IF;

  -- Index สำหรับตารางบันทึกเวลาเข้า-ออกงาน (attendance)
  IF to_regclass('public.attendance') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_attendance_created_at_desc ON public.attendance(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_line_user_id ON public.attendance(line_user_id);
  END IF;

  -- Index สำหรับการนัดหมาย (appointments)
  IF to_regclass('public.appointments') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_appointments_date_therapist ON public.appointments(date, therapist_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_hn ON public.appointments(hn);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
  END IF;

  -- Index สำหรับใบเสร็จและการเงิน (receipts & transactions)
  IF to_regclass('public.receipts') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_receipts_date ON public.receipts(date);
    CREATE INDEX IF NOT EXISTS idx_receipts_hn ON public.receipts(hn);
  END IF;

  IF to_regclass('public.transactions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
  END IF;

  -- Index สำหรับบันทึก OPD และการประเมิน (opd_records, assessments, itp_goals)
  IF to_regclass('public.opd_records') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_opd_records_hn ON public.opd_records(hn);
  END IF;

  IF to_regclass('public.assessments') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_assessments_hn ON public.assessments(hn);
  END IF;

  IF to_regclass('public.itp_goals') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_itp_goals_hn ON public.itp_goals(hn);
  END IF;

  RAISE NOTICE 'Optimization indexes created successfully for Hug Dee Home.';
END $$;
