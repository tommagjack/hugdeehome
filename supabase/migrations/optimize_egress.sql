-- ==============================================================================
-- SQL Optimization Script for Supabase Free Plan (Hug Dee Home)
-- Script: optimize_egress.sql
-- คำแนะนำ: สามารถนำสคริปต์นี้ไปเปิดใน Supabase Dashboard -> SQL Editor แล้วกด Run
-- เพื่อเพิ่ม Index เพิ่มประสิทธิภาพการค้นหา และลดเวลาในการประมวลผลข้อมูลของฐานข้อมูล
-- ==============================================================================

-- 1. Index สำหรับการค้นหาคนไข้และผู้ปกครอง (ใช้บ่อยใน LIFF, Check-in, Appointments)
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_line_user_id ON public.patients(line_user_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);

-- 2. Index สำหรับการค้นหาพนักงานและการผูก LINE User ID
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON public.users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users(role, status);

-- 3. Index สำหรับตารางบันทึกเวลาเข้า-ออกงาน (Attendance)
-- ช่วยให้การดึง 100-300 รายการล่าสุดเร็วขึ้น และใช้ Database IO / Egress น้อยที่สุด
CREATE INDEX IF NOT EXISTS idx_attendance_created_at_desc ON public.attendance(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_line_user_id ON public.attendance(line_user_id);

-- 4. Index สำหรับการนัดหมาย (Appointments)
CREATE INDEX IF NOT EXISTS idx_appointments_date_therapist ON public.appointments(date, therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hn ON public.appointments(hn);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 5. Index สำหรับใบเสร็จและการเงิน (Receipts & Transactions)
CREATE INDEX IF NOT EXISTS idx_receipts_date ON public.receipts(date);
CREATE INDEX IF NOT EXISTS idx_receipts_hn ON public.receipts(hn);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);

-- 6. Index สำหรับบันทึก OPD และการประเมิน (OPD Records & Assessments)
CREATE INDEX IF NOT EXISTS idx_opd_records_hn ON public.opd_records(hn);
CREATE INDEX IF NOT EXISTS idx_assessments_hn ON public.assessments(hn);
CREATE INDEX IF NOT EXISTS idx_itp_goals_hn ON public.itp_goals(hn);

-- บันทึกข้อความยืนยันการรันสำเร็จ
DO $$
BEGIN
  RAISE NOTICE 'Optimization indexes created successfully for Hug Dee Home.';
END $$;
