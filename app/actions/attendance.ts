'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

// Common Zod schema pieces
const AttendanceRecordSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  remarks: z.string().optional()
});

const SaveAttendanceSchema = z.object({
  records: z.array(AttendanceRecordSchema),
  recordedBy: z.string().uuid("Invalid user ID")
});

export type AttendanceActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processSaveAttendanceAction(
  prevState: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  const recordsStr = formData.get('records') as string;
  const recordedBy = formData.get('recordedBy') as string;

  let parsedRecords = [];
  try {
    parsedRecords = JSON.parse(recordsStr);
  } catch (err) {
    return { success: false, message: "Invalid records format" };
  }

  const rawData = {
    records: parsedRecords,
    recordedBy: recordedBy
  };

  const validatedFields = SaveAttendanceSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { records, recordedBy: authUserId } = validatedFields.data;

  if (records.length === 0) {
    return { success: true, message: "No attendance to record." };
  }

  const supabase = await createClient();
  
  try {
    const studentIds = records.map(r => r.student_id);
    const targetDate = records[0].date;

    // 1. Fetch existing records in batch
    const { data: existingRecords, error: fetchError } = await supabase
      .from('attendance')
      .select('id, student_id')
      .in('student_id', studentIds)
      .eq('date', targetDate);

    if (fetchError) throw fetchError;

    const updates = [];
    const inserts = [];

    for (const record of records) {
      const existing = existingRecords?.find(e => e.student_id === record.student_id);
      if (existing) {
        updates.push({
          id: existing.id,
          status: record.status,
          notes: record.remarks || ''
        });
      } else {
        inserts.push({
          student_id: record.student_id,
          date: record.date,
          status: record.status,
          notes: record.remarks || ''
        });
      }
    }

    // 2. Perform batch insertion
    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('attendance')
        .insert(inserts);
      if (insertError) throw insertError;
    }

    // 3. Perform batch updates in parallel
    if (updates.length > 0) {
      const updatePromises = updates.map(u => 
        supabase
          .from('attendance')
          .update({ status: u.status, notes: u.notes })
          .eq('id', u.id)
      );
      const results = await Promise.all(updatePromises);
      const firstError = results.find(r => r.error)?.error;
      if (firstError) throw firstError;
    }
  } catch (err: any) {
    console.error("Save attendance failed:", err);
    return { success: false, message: "Database update failed: " + (err.message || err) };
  }

  // Create an audit log for attendance submission
  // Just log the first date and number of records for brevity
  const targetDate = records[0].date;
  await logAudit('ATTENDANCE_RECORDED', authUserId, {
    date: targetDate,
    students_counted: records.length,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `Successfully saved attendance for ${records.length} students.` };
}
