import { describe, it, expect } from 'vitest';
import { parseVisitorFields } from '@/lib/api/visitors';
import { parseInventoryFields } from '@/lib/api/inventory';

describe('parseVisitorFields', () => {
  it('returns null for null input', () => {
    expect(parseVisitorFields(null)).toBeNull();
  });

  it('parses a standard visitor record', () => {
    const raw = {
      id: 'vis-1',
      name: 'Ned Flanders',
      purpose: 'Parent Meeting',
      host: 'Principal Skinner',
      badge_id: 'B-001',
      check_in: '2025-06-17T08:00:00Z',
      check_out: null,
      status: 'Active',
      created_at: '2025-06-17T07:00:00Z',
    };

    const result = parseVisitorFields(raw as any);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('vis-1');
    expect(result!.name).toBe('Ned Flanders');
    expect(result!.purpose).toBe('Parent Meeting');
    expect(result!.host).toBe('Principal Skinner');
    expect(result!.badge_id).toBe('B-001');
    expect(result!.check_in).toBe('2025-06-17T08:00:00Z');
    expect(result!.status).toBe('Active');
  });

  it('extracts host from purpose field when host column missing (legacy fallback)', () => {
    const raw = {
      id: 'vis-2',
      name: 'Kirk Van Houten',
      purpose: 'Meeting with Teacher | Host: Ms. Krabappel',
      host: '',
      check_in: '2025-06-17T09:00:00Z',
      status: 'Active',
      created_at: '2025-06-17T08:30:00Z',
    };

    const result = parseVisitorFields(raw as any);
    expect(result!.purpose).toBe('Meeting with Teacher');
    expect(result!.host).toBe('Ms. Krabappel');
  });

  it('handles missing optional fields gracefully', () => {
    const raw = {
      id: 'vis-3',
      name: 'Moe Szyslak',
      check_in: '2025-06-17T10:00:00Z',
      created_at: '2025-06-17T09:00:00Z',
    };

    const result = parseVisitorFields(raw as any);
    expect(result!.name).toBe('Moe Szyslak');
    expect(result!.purpose).toBe('');
    expect(result!.host).toBe('');
    expect(result!.status).toBeUndefined();
  });
});

describe('parseInventoryFields', () => {
  it('returns null for null input', () => {
    expect(parseInventoryFields(null)).toBeNull();
  });

  it('parses a standard inventory record', () => {
    const raw = {
      id: 'inv-1',
      name: 'Notebooks',
      category: 'Supplies',
      quantity: 50,
      status: 'Available',
      assigned_to: 'Classroom A',
      next_maintenance_date: '2025-12-31',
      created_at: '2025-01-01T00:00:00Z',
    };

    const result = parseInventoryFields(raw as any);
    expect(result!.id).toBe('inv-1');
    expect(result!.name).toBe('Notebooks');
    expect(result!.category).toBe('Supplies');
    expect(result!.quantity).toBe(50);
    expect(result!.status).toBe('Available');
    expect(result!.assigned_to).toBe('Classroom A');
    expect(result!.next_maintenance_date).toBe('2025-12-31');
  });

  it('extracts assigned_to and maintenance from category fallback', () => {
    const raw = {
      id: 'inv-2',
      name: 'Projector',
      category: 'Electronics | Assigned: Conference Room | Maintenance: 2025-06-01',
      quantity: 3,
      status: 'In Use',
      created_at: '2025-03-01T00:00:00Z',
    };

    const result = parseInventoryFields(raw as any);
    expect(result!.category).toBe('Electronics');
    expect(result!.assigned_to).toBe('Conference Room');
    expect(result!.next_maintenance_date).toBe('2025-06-01');
  });

  it('handles partial legacy fallback (assigned only)', () => {
    const raw = {
      id: 'inv-3',
      name: 'Laptop',
      category: 'IT Equipment | Assigned: John Doe',
      quantity: 1,
      created_at: '2025-03-01T00:00:00Z',
    };

    const result = parseInventoryFields(raw as any);
    expect(result!.category).toBe('IT Equipment');
    expect(result!.assigned_to).toBe('John Doe');
    expect(result!.next_maintenance_date).toBe('');
  });

  it('handles partial legacy fallback (maintenance only)', () => {
    const raw = {
      id: 'inv-4',
      name: 'Server',
      category: 'Hardware | Maintenance: 2025-09-01',
      quantity: 2,
      created_at: '2025-03-01T00:00:00Z',
    };

    const result = parseInventoryFields(raw as any);
    expect(result!.category).toBe('Hardware');
    expect(result!.assigned_to).toBe('');
    expect(result!.next_maintenance_date).toBe('2025-09-01');
  });

  it('defaults quantity to 0 and status to Available', () => {
    const raw = {
      id: 'inv-5',
      name: 'Misc Item',
      created_at: '2025-03-01T00:00:00Z',
    };

    const result = parseInventoryFields(raw as any);
    expect(result!.quantity).toBe(0);
    expect(result!.status).toBe('Available');
    expect(result!.category).toBe('general');
  });
});
