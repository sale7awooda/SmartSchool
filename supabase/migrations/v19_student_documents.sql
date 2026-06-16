-- Migration: Student Documents Table
-- Store student documents like IDs, birth certificates, etc.

CREATE TABLE IF NOT EXISTS student_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'ID', 'Birth Certificate', 'Medical Record', 'Previous Marks', etc.
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all student documents"
  ON student_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Parents can view their student documents"
  ON student_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM parent_student ps 
    WHERE ps.student_id = student_documents.student_id 
    AND ps.parent_id = auth.uid()
  ));

CREATE POLICY "Students can view their own documents"
  ON student_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = student_documents.student_id 
    AND s.user_id = auth.uid()
  ));
