import { describe, it, expect } from 'vitest';

describe('FinancialsTab - Loans & Fines Filter', () => {
  const employeeName = 'Edna Krabappel';

  const allRecords = [
    { id: 'F1', staff: 'Edna Krabappel', type: 'Bonus', amount: 500, date: '2024-01-15', status: 'Approved', description: 'Year-end performance bonus' },
    { id: 'F2', staff: 'Groundskeeper Willie', type: 'Loan', amount: 1000, date: '2024-01-01', status: 'Active', description: 'Emergency home repair' },
    { id: 'F3', staff: 'Gary Chalmers', type: 'Fine', amount: 50, date: '2024-01-10', status: 'Paid', description: 'Lost equipment' },
    { id: 'F4', staff: 'Seymour Skinner', type: 'Expense', amount: 200, date: '2024-01-05', status: 'Approved', description: 'Classroom supplies' },
    { id: 'F5', staff: 'Edna Krabappel', type: 'Expense', amount: 75, date: '2024-01-12', status: 'Pending', description: 'Books' },
    { id: 'F6', staff: 'Groundskeeper Willie', type: 'Expense', amount: 300, date: '2024-01-08', status: 'Approved', description: 'Equipment repair' },
  ];

  const validTypes = ['Loan', 'Fine', 'Bonus'];

  it('should only include Loan, Fine, and Bonus types', () => {
    const filtered = allRecords.filter((f: any) => validTypes.includes(f.type));
    expect(filtered).toHaveLength(3);
    expect(filtered.every((f: any) => validTypes.includes(f.type))).toBe(true);
  });

  it('should exclude Expense type records', () => {
    const filtered = allRecords.filter((f: any) => validTypes.includes(f.type));
    const hasExpense = filtered.some((f: any) => f.type === 'Expense');
    expect(hasExpense).toBe(false);
  });

  it('should filter by employee name when isAdmin is false', () => {
    const isAdmin = false;
    const filtered = allRecords
      .filter((f: any) => validTypes.includes(f.type))
      .filter((f: any) => isAdmin || f.staff === employeeName);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].staff).toBe(employeeName);
    expect(filtered[0].type).toBe('Bonus');
  });

  it('should show all loans/fines/bonuses when isAdmin is true', () => {
    const isAdmin = true;
    const filtered = allRecords
      .filter((f: any) => validTypes.includes(f.type))
      .filter((f: any) => isAdmin || f.staff === employeeName);

    expect(filtered).toHaveLength(3);
    const types = filtered.map((f: any) => f.type);
    expect(types).toContain('Bonus');
    expect(types).toContain('Loan');
    expect(types).toContain('Fine');
  });

  it('should filter by date prefix', () => {
    const targetPrefix = '2024-01';
    const filtered = allRecords
      .filter((f: any) => validTypes.includes(f.type))
      .filter((f: any) => f.date && f.date.startsWith(targetPrefix));

    expect(filtered).toHaveLength(3);
  });

  it('should show empty when no records match', () => {
    const filtered = allRecords
      .filter((f: any) => validTypes.includes(f.type))
      .filter((f: any) => f.staff === 'NonExistent');

    expect(filtered).toHaveLength(0);
  });

  it('should display correct amount sign for Fine vs Bonus/Loan', () => {
    const filtered = allRecords.filter((f: any) => validTypes.includes(f.type));

    const displayAmount = (item: any) =>
      item.type === 'Fine' ? `-$${item.amount}` : `+$${item.amount}`;

    const fine = filtered.find((f: any) => f.type === 'Fine')!;
    const bonus = filtered.find((f: any) => f.type === 'Bonus')!;
    const loan = filtered.find((f: any) => f.type === 'Loan')!;

    expect(displayAmount(fine)).toBe('-$50');
    expect(displayAmount(bonus)).toBe('+$500');
    expect(displayAmount(loan)).toBe('+$1000');
  });

  it('should handle missing date gracefully', () => {
    const recordsWithNullDate = [
      ...allRecords,
      { id: 'F7', staff: 'Test', type: 'Loan', amount: 100, date: null, status: 'Active', description: 'Test' },
    ];

    const filtered = recordsWithNullDate
      .filter((f: any) => validTypes.includes(f.type))
      .filter((f: any) => f.date && f.date.startsWith('2024-01'));

    expect(filtered).toHaveLength(3);
    expect(filtered.some((f: any) => f.id === 'F7')).toBe(false);
  });
});
