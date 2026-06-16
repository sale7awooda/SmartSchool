CREATE POLICY "Allow all actions for authenticated users" ON assessment_questions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all actions for authenticated users" ON assessments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all actions for authenticated users" ON submissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all actions for authenticated users" ON submission_answers FOR ALL USING (auth.role() = 'authenticated');

-- Also, dropping might be needed first if there are restrictive policies
ALTER TABLE assessment_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE submission_answers DISABLE ROW LEVEL SECURITY;
