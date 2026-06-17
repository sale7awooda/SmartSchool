'use server';

import { parseCSV, type ColumnMapper, type ImportResult } from '@/lib/csv-parser';
import { createAdminClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

const staffColumnMapper: ColumnMapper = {
  'name': 'name',
  'full_name': 'name',
  'staff_name': 'name',
  'email': 'email',
  'e_mail': 'email',
  'role': 'role',
  'position': 'role',
  'phone': 'phone',
  'telephone': 'phone',
  'mobile': 'phone',
  'department': 'department',
  'dept': 'department',
  'designation': 'designation',
  'title': 'designation',
  'address': 'address',
  'date_of_join': 'date_of_join',
  'join_date': 'date_of_join',
  'start_date': 'date_of_join',
  'salary': 'salary',
  'can_mark_attendance': 'can_mark_attendance',
  'education': 'education',
  'qualification': 'education',
  'qualifications': 'education',
  'dob': 'dob',
  'date_of_birth': 'dob',
  'birth_date': 'dob',
  'gender': 'gender',
  'extra_info': 'extra_info',
  'notes': 'extra_info',
  'password': 'password',
};

interface StaffImportData {
  name: string;
  email: string;
  role: string;
  phone: string;
  department: string;
  designation: string;
  address: string;
  date_of_join: string;
  salary: string;
  can_mark_attendance: string;
  education: string;
  dob: string;
  gender: string;
  extra_info: string;
  password: string;
}

const VALID_ROLES = ['teacher', 'staff', 'accountant', 'admin'];

function validateStaffRow(row: Record<string, string>, rowNumber: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!VALID_ROLES.includes(row.role)) {
    errors.push(`Invalid role "${row.role}". Must be one of: ${VALID_ROLES.join(', ')}.`);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push(`Invalid email "${row.email}".`);
  }

  if (row.salary && isNaN(parseFloat(row.salary))) {
    errors.push(`Invalid salary "${row.salary}". Must be a number.`);
  }

  if (row.dob && !/^\d{4}-\d{2}-\d{2}$/.test(row.dob)) {
    errors.push(`Invalid date format "${row.dob}". Use YYYY-MM-DD.`);
  }

  if (row.date_of_join && !/^\d{4}-\d{2}-\d{2}$/.test(row.date_of_join)) {
    errors.push(`Invalid date_of_join format "${row.date_of_join}". Use YYYY-MM-DD.`);
  }

  return { valid: errors.length === 0, errors };
}

function transformStaffRow(row: Record<string, string>): StaffImportData {
  return {
    name: row.name || '',
    email: row.email || '',
    role: row.role || '',
    phone: row.phone || '',
    department: row.department || '',
    designation: row.designation || '',
    address: row.address || '',
    date_of_join: row.date_of_join || '',
    salary: row.salary || '',
    can_mark_attendance: row.can_mark_attendance || 'false',
    education: row.education || '',
    dob: row.dob || '',
    gender: row.gender || '',
    extra_info: row.extra_info || '',
    password: row.password || 'password123',
  };
}

export async function importStaffFromCSV(
  csvContent: string,
  userId: string
): Promise<ImportResult<{ email: string; name: string }>> {
  const parsed = parseCSV<StaffImportData>(
    csvContent,
    staffColumnMapper,
    validateStaffRow,
    transformStaffRow,
    ['name', 'email', 'role']
  );

  if (parsed.data.length === 0) {
    return parsed;
  }

  const adminClient = createAdminClient();
  const results: { email: string; name: string }[] = [];

  for (const staff of parsed.data) {
    try {
      const { data: listData } = await adminClient.auth.admin.listUsers();
      let authUser = listData?.users.find(u => u.email === staff.email);

      if (!authUser) {
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: staff.email,
          email_confirm: true,
          password: staff.password,
          user_metadata: { name: staff.name, role: staff.role },
        });

        if (authError) {
          const { data: fallbackData } = await adminClient.auth.signUp({
            email: staff.email,
            password: staff.password,
            options: { data: { name: staff.name, role: staff.role } },
          });
          authUser = fallbackData?.user || undefined;
        } else {
          authUser = authData?.user || undefined;
        }
      }

      if (!authUser) {
        parsed.errors.push({ row: 0, message: `Failed to create auth user for ${staff.email}. Skipped.` });
        continue;
      }

      const { error: dbError } = await adminClient
        .from('users')
        .upsert([{
          id: authUser.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          phone: staff.phone || null,
          department: staff.department || null,
          designation: staff.designation || null,
          address: staff.address || null,
          date_of_join: staff.date_of_join || null,
          salary: staff.salary ? parseFloat(staff.salary) : null,
          can_mark_attendance: staff.can_mark_attendance === 'true',
          education: staff.education || null,
          dob: staff.dob || null,
          gender: staff.gender || null,
          extra_info: staff.extra_info || null,
          created_at: new Date().toISOString(),
        }], { onConflict: 'id' });

      if (dbError) {
        parsed.errors.push({ row: 0, message: `DB insert failed for ${staff.email}: ${dbError.message}` });
        continue;
      }

      results.push({ email: staff.email, name: staff.name });
    } catch (err: any) {
      parsed.errors.push({ row: 0, message: `Unexpected error for ${staff.email}: ${err.message}` });
    }
  }

  await logAudit('STAFF_IMPORTED', userId, {
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
