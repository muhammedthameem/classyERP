-- Run this in your Supabase Dashboard -> SQL Editor (for project: voflbggkzldfwmedxcxk)
-- This script fixes the erp_accounts schema so income, expense, and migration entries save successfully.

-- 1. Ensure id defaults to a generated UUID/text so inserts without an explicit id succeed:
ALTER TABLE IF EXISTS public.erp_accounts ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- 2. Add all missing accounting columns needed by the ERP:
ALTER TABLE IF EXISTS public.erp_accounts 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Ensure Row Level Security (RLS) allows full read/write for the app:
ALTER TABLE IF EXISTS public.erp_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for erp_accounts" ON public.erp_accounts;
CREATE POLICY "Allow all operations for erp_accounts" 
  ON public.erp_accounts 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 4. Enable realtime replication for accounts so real-time updates work:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'erp_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_accounts;
  END IF;
END $$;
