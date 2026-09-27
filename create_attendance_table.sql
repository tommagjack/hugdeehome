-- =========================================================================
-- สคริปต์สร้างตาราง attendance สำหรับระบบลงเวลาเข้า-ออกงาน (Time Attendance)
-- คลินิกบ้านฮักดี (Hug Dee Home)
-- สามารถคัดลอกไปรันใน Supabase SQL Editor ได้ทันที
-- =========================================================================

-- 1. สร้างตาราง attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  date TEXT NOT NULL,               -- รูปแบบ YYYY-MM-DD เช่น '2026-09-26'
  time TEXT NOT NULL,               -- รูปแบบ HH:mm:ss เช่น '08:30:15'
  type TEXT NOT NULL,               -- 'เข้างาน' หรือ 'เลิกงาน' (IN / OUT)
  latitude NUMERIC,                 -- พิกัดละติจูด
  longitude NUMERIC,                -- พิกัดลองจิจูด
  accuracy NUMERIC,                 -- ความแม่นยำพิกัด (เมตร)
  maps_url TEXT,                    -- ลิงก์ Google Maps
  work_hours NUMERIC DEFAULT 0,     -- จำนวนชั่วโมงทำงาน (คำนวณตอนเลิกงาน)
  line_user_id TEXT,                -- LINE User ID พนักงานที่ผูกไว้
  notes TEXT,                       -- หมายเหตุเพิ่มเติม
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. เพิ่ม Index เพื่อให้ค้นหาตาม employee_id และ date ได้รวดเร็ว
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance (employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance (date);

-- 3. เพิ่มคอลัมน์ line_user_id ในตาราง users เพื่อบันทึกการผูกบัญชี LINE OA พนักงาน
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS line_user_id TEXT;

-- 4. ตั้งค่าสิทธิ์ Row Level Security (RLS) เพื่อให้ระบบอ่านและบันทึกข้อมูลได้
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- อนุญาตให้อ่านและบันทึกข้อมูลการลงเวลาได้ทั้ง anon และ authenticated
DROP POLICY IF EXISTS "Allow anon read attendance" ON public.attendance;
CREATE POLICY "Allow anon read attendance" ON public.attendance FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert attendance" ON public.attendance;
CREATE POLICY "Allow anon insert attendance" ON public.attendance FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update attendance" ON public.attendance;
CREATE POLICY "Allow anon update attendance" ON public.attendance FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon delete attendance" ON public.attendance;
CREATE POLICY "Allow anon delete attendance" ON public.attendance FOR DELETE USING (true);

-- อนุญาตให้อ่านและอัปเดต line_user_id ใน users
DROP POLICY IF EXISTS "Allow anon update line_user_id on users" ON public.users;
CREATE POLICY "Allow anon update line_user_id on users" ON public.users FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select users" ON public.users;
CREATE POLICY "Allow anon select users" ON public.users FOR SELECT USING (true);

-- อนุญาตให้อ่านข้อมูล clinic_info สำหรับดึง Token ส่งข้อความ LINE
GRANT SELECT ON public.clinic_info TO anon, authenticated;
ALTER TABLE public.clinic_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read clinic_info" ON public.clinic_info;
CREATE POLICY "Allow anon read clinic_info" ON public.clinic_info FOR SELECT USING (true);

-- ให้สิทธิ์กับตาราง attendance แก่บทบาท anon และ authenticated
GRANT ALL ON public.attendance TO anon, authenticated;

-- สิ้นสุดสคริปต์
