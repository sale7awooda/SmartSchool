-- Migration v21: Fix visitors and inventory columns to match UI
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS host TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS badge_id TEXT;

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS next_maintenance_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Ensure RLS policies are up to date (permissive for dev)
DROP POLICY IF EXISTS "permissive_all" ON visitors;
CREATE POLICY "permissive_all" ON visitors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "permissive_all" ON inventory;
CREATE POLICY "permissive_all" ON inventory FOR ALL USING (true) WITH CHECK (true);
