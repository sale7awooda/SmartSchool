'use server';

import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

const CreateInvoiceSchema = z.object({
  studentId: z.string().uuid("Invalid student ID").optional().nullable().or(z.literal('')),
  amount: z.number().positive("Amount must be greater than zero"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().min(1, "Description is required"),
  createdBy: z.string().uuid("Invalid user ID"),
  title: z.string().optional().nullable()
});

export type CreateInvoiceState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processCreateInvoiceAction(
  prevState: CreateInvoiceState,
  formData: FormData
): Promise<CreateInvoiceState> {
  const rawData = {
    studentId: formData.get('studentId') ? (formData.get('studentId') as string) : null,
    amount: parseFloat(formData.get('amount') as string),
    dueDate: formData.get('dueDate') as string,
    description: formData.get('description') as string,
    createdBy: formData.get('createdBy') as string,
    title: formData.get('title') ? (formData.get('title') as string) : null,
  };

  const validatedFields = CreateInvoiceSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const data = validatedFields.data;
  const adminClient = createAdminClient();
  const insertStudentId = (data.studentId && data.studentId.trim() !== '') ? data.studentId : null;

  const { data: newInvoice, error: invoiceError } = await adminClient
    .from('fee_invoices')
    .insert([
      {
        student_id: insertStudentId,
        amount: data.amount,
        due_date: data.dueDate,
        description: data.description,
        status: 'pending',
        title: data.title || 'General Invoice',
        balance_due: data.amount
      }
    ])
    .select()
    .single();

  if (invoiceError) {
    console.error(invoiceError);
    return { success: false, message: "Database creation failed: " + invoiceError.message };
  }

  await logAudit('FEE_INVOICE_CREATED', data.createdBy, {
    invoice_id: newInvoice.id,
    student_id: insertStudentId,
    amount: data.amount,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: "Invoice created successfully." };
}
const VoidInvoiceSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID format"),
  voidedBy: z.string().uuid("Invalid user ID")
});

export type VoidInvoiceState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processVoidInvoiceAction(
  prevState: VoidInvoiceState,
  formData: FormData
): Promise<VoidInvoiceState> {
  const rawData = {
    invoiceId: formData.get('invoiceId') as string,
    voidedBy: formData.get('voidedBy') as string,
  };

  const validatedFields = VoidInvoiceSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const data = validatedFields.data;
  const adminClient = createAdminClient();
  const { error: invoiceError } = await adminClient
    .from('fee_invoices')
    .update({ status: 'void' })
    .eq('id', data.invoiceId)
    .select()
    .single();

  if (invoiceError) {
    console.error(invoiceError);
    return { success: false, message: "Database update failed: " + invoiceError.message };
  }

  // Write securely to Audit Logs
  await logAudit('FEE_INVOICE_VOIDED', data.voidedBy, {
    invoice_id: data.invoiceId,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: "Invoice voided successfully." };
}

// Zod Schema for Secure Validation Boundary
const PaymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID format"),
  amount: z.number().positive("Amount must be greater than zero"),
  paymentMethod: z.enum(['Cash', 'Credit Card', 'Bank Transfer', 'Cheque', 'Card']),
  referenceNumber: z.string().max(50, "Notes too long").optional().or(z.literal('')),
  recordedBy: z.string().uuid("Invalid user ID")
});

export type RecordPaymentState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processPaymentAction(
  prevState: RecordPaymentState,
  formData: FormData
): Promise<RecordPaymentState> {
  // 1. Zod Parsing Server-side
  const rawData = {
    invoiceId: formData.get('invoiceId') as string,
    amount: parseFloat(formData.get('amount') as string),
    paymentMethod: formData.get('paymentMethod') as string,
    referenceNumber: formData.get('referenceNumber') as string,
    recordedBy: formData.get('recordedBy') as string,
  };

  const validatedFields = PaymentSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const data = validatedFields.data;
  const adminClient = createAdminClient();

  const { data: rpcResult, error: rpcError } = await adminClient.rpc('record_fee_payment', {
    p_invoice_id: data.invoiceId,
    p_amount: data.amount,
    p_payment_method: data.paymentMethod,
    p_reference_number: data.referenceNumber || '',
    p_recorded_by: data.recordedBy
  });

  if (rpcError) {
    console.error(rpcError);
    return { success: false, message: "Database payment transaction failed: " + rpcError.message };
  }

  if (rpcResult && !rpcResult.success) {
    return { success: false, message: rpcResult.message || "Payment transaction rejected by database." };
  }

  // 3. Write securely to Audit Logs
  await logAudit('FEE_PAYMENT_RECORDED', data.recordedBy, {
    invoice_id: data.invoiceId,
    amount: data.amount,
    method: data.paymentMethod,
    reference: data.referenceNumber,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: "Payment processed successfully!" };
}

const FeeItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  frequency: z.string().min(1, "Frequency is required"),
  category: z.string().min(1, "Category is required"),
  createdBy: z.string().uuid("Invalid user ID")
});

export type FeeItemState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processCreateFeeItemAction(
  prevState: FeeItemState,
  formData: FormData
): Promise<FeeItemState> {
  const rawData = {
    name: formData.get('name') as string,
    amount: parseFloat(formData.get('amount') as string),
    frequency: formData.get('frequency') as string,
    category: formData.get('category') as string,
    createdBy: formData.get('createdBy') as string,
  };

  const validatedFields = FeeItemSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const data = validatedFields.data;
  const adminClient = createAdminClient();

  const { data: newFeeItem, error } = await adminClient
    .from('fee_items')
    .insert([{
      name: data.name,
      amount: data.amount,
      frequency: data.frequency,
      category: data.category
    }])
    .select()
    .single();

  if (error) {
    console.error(error);
    return { success: false, message: "Failed to create fee item: " + error.message };
  }

  await logAudit('FEE_ITEM_CREATED', data.createdBy, {
    item_id: newFeeItem.id,
    name: data.name,
    amount: data.amount
  });

  return { success: true, message: "Fee item created successfully." };
}

const UpdateFeeItemSchema = FeeItemSchema.extend({
  id: z.string().uuid("Invalid fee item ID")
});

export async function processUpdateFeeItemAction(
  prevState: FeeItemState,
  formData: FormData
): Promise<FeeItemState> {
  const rawData = {
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    amount: parseFloat(formData.get('amount') as string),
    frequency: formData.get('frequency') as string,
    category: formData.get('category') as string,
    createdBy: formData.get('createdBy') as string,
  };

  const validatedFields = UpdateFeeItemSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { id, createdBy, ...updateData } = validatedFields.data;
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('fee_items')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error(error);
    return { success: false, message: "Failed to update fee item: " + error.message };
  }

  await logAudit('FEE_ITEM_UPDATED', createdBy, {
    item_id: id,
    name: updateData.name,
    amount: updateData.amount
  });

  return { success: true, message: "Fee item updated successfully." };
}

const DeleteFeeItemSchema = z.object({
  id: z.string().uuid("Invalid fee item ID"),
  deletedBy: z.string().uuid("Invalid user ID")
});

export async function processDeleteFeeItemAction(
  prevState: FeeItemState,
  formData: FormData
): Promise<FeeItemState> {
  const rawData = {
    id: formData.get('id') as string,
    deletedBy: formData.get('deletedBy') as string,
  };

  const validatedFields = DeleteFeeItemSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { id, deletedBy } = validatedFields.data;
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('fee_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return { success: false, message: "Failed to delete fee item: " + error.message };
  }

  await logAudit('FEE_ITEM_DELETED', deletedBy, {
    item_id: id
  });

  return { success: true, message: "Fee item deleted successfully." };
}

export async function createExpenseAction(expenseData: any) {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from('financials').insert([{
    type: expenseData.type || 'Expense',
    category: expenseData.category,
    amount: expenseData.amount,
    date: expenseData.date,
    description: expenseData.description,
    status: expenseData.status || 'Paid'
  }]);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}
