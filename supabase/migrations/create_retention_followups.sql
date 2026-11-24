-- ==============================================================================
-- SQL Migration: สร้างตาราง retention_followups (ระบบติดตามผู้รับบริการ Retention Follow-up)
-- สามารถนำไปรันใน Supabase Dashboard -> SQL Editor ได้ตามต้องการ
-- (หากยังไม่ได้รัน ระบบมี Auto-Fallback ซิงค์ผ่าน Cloud อัตโนมัติอยู่แล้ว)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.retention_followups (
  id TEXT PRIMARY KEY,
  hn TEXT NOT NULL,
  reminder_date TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'กำลังติดตาม',
  assignee TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- เปิดใช้งาน RLS และอนุญาตให้ผู้ใช้งานที่ล็อกอินเข้าถึงข้อมูลได้
ALTER TABLE public.retention_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to retention_followups" ON public.retention_followups;
CREATE POLICY "Allow authenticated full access to retention_followups" ON public.retention_followups
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ตั้งค่า REPLICA IDENTITY FULL และเพิ่มเข้า Supabase Realtime
ALTER TABLE IF EXISTS public.retention_followups REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retention_followups;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;

  IF to_regclass('public.retention_followups') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_retention_followups_reminder_date ON public.retention_followups(reminder_date DESC);
    CREATE INDEX IF NOT EXISTS idx_retention_followups_status ON public.retention_followups(status);
    CREATE INDEX IF NOT EXISTS idx_retention_followups_hn ON public.retention_followups(hn);
  END IF;
END $$;
