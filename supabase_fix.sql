CREATE OR REPLACE VIEW fee_invoices_view AS
SELECT 
  fi.*,
  fi.id::TEXT AS id_text,
  s.grade AS student_grade,
  s.academic_year AS student_academic_year,
  u.name AS student_name
FROM fee_invoices fi
JOIN students s ON fi.student_id = s.id
JOIN users u ON s.user_id = u.id;
