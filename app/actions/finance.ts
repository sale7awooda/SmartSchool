'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

export const CreateInvoiceSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  amount: z.number().positive("Amount must be greater than zero"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().min(1, "Description is required"),
  createdBy: z.string().uuid("Invalid user ID")
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
    studentId: formData.get('studentId') as string,
    amount: parseFloat(formData.get('amount') as string),
    dueDate: formData.get('dueDate') as string,
    description: formData.get('description') as string,
    createdBy: formData.get('createdBy') as string,
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

  const supabase = await createClient();
  const { data: newInvoice, error: invoiceError } = await supabase
    .from('fee_invoices')
    .insert([
      {
        student_id: data.studentId,
        amount: data.amount,
        due_date: data.dueDate,
        description: data.description,
        status: 'pending'
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
    student_id: data.studentId,
    amount: data.amount,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: "Invoice created successfully." };
}
export const VoidInvoiceSchema = z.object({
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

  const supabase = await createClient();
  const { error: invoiceError } = await supabase
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
export const PaymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID format"),
  amount: z.number().positive("Amount must be greater than zero"),
  paymentMethod: z.enum(['Cash', 'Credit Card', 'Bank Transfer', 'Cheque']),
  referenceNumber: z.string().max(50, "Reference number too long").optional(),
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

  // 2. Perform Backend DB Write (simulating server action boundary)
  const supabase = await createClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from('fee_invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: data.paymentMethod,
    })
    .eq('id', data.invoiceId)
    .select()
    .single();

  if (invoiceError) {
    console.error(invoiceError);
    return { success: false, message: "Database update failed: " + invoiceError.message };
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

export const FeeItemSchema = z.object({
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
  const supabase = await createClient();

  const { data: newFeeItem, error } = await supabase
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

export const UpdateFeeItemSchema = FeeItemSchema.extend({
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
  const supabase = await createClient();

  const { error } = await supabase
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

export const DeleteFeeItemSchema = z.object({
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
  const supabase = await createClient();

  const { error } = await supabase
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
