'use server';

import { parseCSV, type ColumnMapper, type ImportResult } from '@/lib/csv-parser';
import { createAdminClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

const studentColumnMapper: ColumnMapper = {
  'name': 'name',
  'student_name': 'name',
  'full_name': 'name',
  'roll_number': 'roll_number',
  'student_id': 'roll_number',
  'id': 'roll_number',
  'grade': 'grade',
  'class': 'grade',
  'dob': 'dob',
  'date_of_birth': 'dob',
  'birth_date': 'dob',
  'gender': 'gender',
  'address': 'address',
  'academic_year': 'academic_year',
  'year': 'academic_year',
  'fee_structure': 'fee_structure',
  'payment_structure': 'payment_structure',
  'payment_plan': 'payment_structure',
  'base_fee': 'base_fee_amount',
  'base_fee_amount': 'base_fee_amount',
  'tuition': 'base_fee_amount',
  'is_custom_fee': 'is_custom_fee',
  'joining_date': 'joining_date',
  'start_date': 'joining_date',
  'discount': 'discount_percentage',
  'discount_percentage': 'discount_percentage',
  'additional_info': 'additional_info',
  'notes': 'additional_info',
  'parent_name': 'parent_name',
  'parent_phone': 'parent_phone',
  'parent_email': 'parent_email',
  'parent_relation': 'parent_relation',
};

interface StudentImportData {
  name: string;
  grade: string;
  roll_number: string;
  dob: string;
  gender: string;
  address: string;
  academic_year: string;
  fee_structure: string;
  payment_structure: string;
  base_fee_amount: string;
  is_custom_fee: string;
  joining_date: string;
  discount_percentage: string;
  additional_info: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  parent_relation: string;
}

const VALID_GENDERS = ['Male', 'Female', 'Other'];

function validateStudentRow(row: Record<string, string>, rowNumber: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (row.gender && !VALID_GENDERS.includes(row.gender)) {
    errors.push(`Invalid gender "${row.gender}". Must be Male, Female, or Other.`);
  }

  if (row.dob && !/^\d{4}-\d{2}-\d{2}$/.test(row.dob)) {
    errors.push(`Invalid date format "${row.dob}". Use YYYY-MM-DD.`);
  }

  if (row.joining_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.joining_date)) {
    errors.push(`Invalid joining_date format "${row.joining_date}". Use YYYY-MM-DD.`);
  }

  if (row.base_fee_amount && isNaN(parseFloat(row.base_fee_amount))) {
    errors.push(`Invalid base_fee_amount "${row.base_fee_amount}". Must be a number.`);
  }

  if (row.discount_percentage && isNaN(parseFloat(row.discount_percentage))) {
    errors.push(`Invalid discount_percentage "${row.discount_percentage}". Must be a number.`);
  }

  if (row.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.parent_email)) {
    errors.push(`Invalid parent_email "${row.parent_email}".`);
  }

  return { valid: errors.length === 0, errors };
}

function transformStudentRow(row: Record<string, string>): StudentImportData {
  return {
    name: row.name || '',
    grade: row.grade || '',
    roll_number: row.roll_number || '',
    dob: row.dob || '',
    gender: row.gender || 'Other',
    address: row.address || '',
    academic_year: row.academic_year || '2025-2026',
    fee_structure: row.fee_structure || '',
    payment_structure: row.payment_structure || '',
    base_fee_amount: row.base_fee_amount || '',
    is_custom_fee: row.is_custom_fee || 'false',
    joining_date: row.joining_date || '',
    discount_percentage: row.discount_percentage || '0',
    additional_info: row.additional_info || '',
    parent_name: row.parent_name || '',
    parent_phone: row.parent_phone || '',
    parent_email: row.parent_email || '',
    parent_relation: row.parent_relation || 'Parent',
  };
}

export async function importStudentsFromCSV(
  csvContent: string,
  userId: string
): Promise<ImportResult<{ roll_number: string; name: string }>> {
  const parsed = parseCSV<StudentImportData>(
    csvContent,
    studentColumnMapper,
    validateStudentRow,
    transformStudentRow,
    ['name', 'grade', 'roll_number']
  );

  if (parsed.data.length === 0) {
    return parsed;
  }

  const adminClient = createAdminClient();
  const results: { roll_number: string; name: string }[] = [];

  for (const student of parsed.data) {
    try {
      const studentEmail = `${student.roll_number.trim().toLowerCase()}@smartschool.com`;

      const { data: existingStudent } = await adminClient
        .from('students')
        .select('id')
        .eq('roll_number', student.roll_number)
        .maybeSingle();

      if (existingStudent) {
        parsed.errors.push({ row: 0, message: `Student ${student.roll_number} already exists. Skipped.` });
        continue;
      }

      const { data: listData } = await adminClient.auth.admin.listUsers();
      let authUser = listData?.users.find(u => u.email === studentEmail);

      if (!authUser) {
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: studentEmail,
          email_confirm: true,
          password: 'password123',
          user_metadata: { name: student.name, role: 'student' },
        });

        if (authError) {
          const { data: fallbackData } = await adminClient.auth.signUp({
            email: studentEmail,
            password: 'password123',
            options: { data: { name: student.name, role: 'student' } },
          });
          authUser = fallbackData?.user || undefined;
        } else {
          authUser = authData?.user || undefined;
        }
      }

      if (!authUser) {
        parsed.errors.push({ row: 0, message: `Failed to create auth user for ${student.roll_number}. Skipped.` });
        continue;
      }

      await adminClient.from('users').upsert([{
        id: authUser.id,
        email: studentEmail,
        name: student.name,
        role: 'student',
        phone: null,
      }]);

      const discountNum = parseFloat(student.discount_percentage) || 0;

      const { data: newStudent, error: studentError } = await adminClient
        .from('students')
        .insert([{
          user_id: authUser.id,
          name: student.name,
          grade: student.grade,
          roll_number: student.roll_number,
          dob: student.dob || null,
          gender: student.gender || 'Other',
          address: student.address || null,
          academic_year: student.academic_year || '2025-2026',
          fee_structure: student.fee_structure || null,
          payment_structure: student.payment_structure || null,
          base_fee_amount: student.base_fee_amount ? parseFloat(student.base_fee_amount) : null,
          is_custom_fee: student.is_custom_fee === 'true',
          joining_date: student.joining_date || null,
          discount_percentage: discountNum,
          additional_info: student.additional_info || null,
        }])
        .select()
        .single();

      if (studentError) {
        parsed.errors.push({ row: 0, message: `DB insert failed for ${student.roll_number}: ${studentError.message}` });
        continue;
      }

      await adminClient.from('users').update({ student_id: newStudent!.id }).eq('id', authUser.id);

      if (student.parent_name && student.parent_phone) {
        const parentEmail = student.parent_email || `parent_${student.parent_phone.replace(/\D/g, '')}@smartschool.com`;

        let { data: parent } = await adminClient
          .from('users')
          .select('*')
          .eq('email', parentEmail)
          .eq('role', 'parent')
          .maybeSingle();

        if (!parent) {
          const { data: parentAuth } = await adminClient.auth.admin.createUser({
            email: parentEmail,
            email_confirm: true,
            password: 'password123',
            user_metadata: { name: student.parent_name, role: 'parent' },
          });

          if (parentAuth?.user) {
            const { data: newParent } = await adminClient.from('users').upsert([{
              id: parentAuth.user.id,
              email: parentEmail,
              name: student.parent_name,
              role: 'parent',
              phone: student.parent_phone,
            }]).select().single();

            parent = newParent;
          }
        }

        if (parent) {
          await adminClient.from('parent_student').upsert([{
            parent_id: parent.id,
            student_id: newStudent!.id,
            relation: student.parent_relation || 'Parent',
          }], { onConflict: 'parent_id,student_id' });
        }
      }

      results.push({ roll_number: student.roll_number, name: student.name });
    } catch (err: any) {
      parsed.errors.push({ row: 0, message: `Unexpected error for ${student.roll_number}: ${err.message}` });
    }
  }

  await logAudit('STUDENTS_IMPORTED', userId, {
    total: parsed.totalRows,
    imported: results.length,
    failed: parsed.errors.length,
    timestamp: new Date().toISOString(),
  });

  return {
    success: parsed.failedRows === 0,
    importedRows: results.length,
    failedRows: parsed.totalRows - results.length,
    totalRows: parsed.totalRows,
    data: results,
    errors: parsed.errors,
  };
}
