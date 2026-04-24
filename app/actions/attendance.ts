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
  const { error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'student_id,date' });

  if (error) {
    console.error(error);
    return { success: false, message: "Database update failed: " + error.message };
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
