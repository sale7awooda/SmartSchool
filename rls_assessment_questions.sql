-- Fix RLS for assessment_questions
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all role-based users" ON assessment_questions;
DROP POLICY IF EXISTS "Enable insert for teachers and admins" ON assessment_questions;
DROP POLICY IF EXISTS "Enable update for teachers and admins" ON assessment_questions;
DROP POLICY IF EXISTS "Enable delete for teachers and admins" ON assessment_questions;

CREATE POLICY "Enable all for authenticated users temporarily" ON assessment_questions FOR ALL USING (auth.role() = 'authenticated');
