import Papa from 'papaparse';

export interface ImportRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

export type ColumnMapper = Record<string, string>;

export interface ImportResult<T> {
  success: boolean;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: { row: number; message: string }[];
  data: T[];
}

export function parseCSV<T>(
  csvContent: string,
  mapper: ColumnMapper,
  validate: (row: Record<string, string>, rowNumber: number) => { valid: boolean; errors: string[] },
  transform: (row: Record<string, string>) => T,
  requiredFields: string[]
): ImportResult<T> {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  const output: ImportResult<T> = {
    success: true,
    totalRows: result.data.length,
    importedRows: 0,
    failedRows: 0,
    errors: [],
    data: [],
  };

  for (let i = 0; i < result.data.length; i++) {
    const rawRow = result.data[i] as Record<string, string>;
    const rowNumber = i + 2;

    const mappedRow: Record<string, string> = {};
    for (const [csvCol, targetCol] of Object.entries(mapper)) {
      if (rawRow[csvCol] !== undefined) {
        mappedRow[targetCol] = rawRow[csvCol].trim();
      }
    }

    const missingFields = requiredFields.filter((f) => !mappedRow[f] || mappedRow[f] === '');
    if (missingFields.length > 0) {
      output.failedRows++;
      output.errors.push({
        row: rowNumber,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
      continue;
    }

    const validation = validate(mappedRow, rowNumber);
    if (!validation.valid) {
      output.failedRows++;
      output.errors.push({ row: rowNumber, message: validation.errors.join('; ') });
      continue;
    }

    output.data.push(transform(mappedRow));
    output.importedRows++;
  }

  if (output.failedRows > 0) {
    output.success = false;
  }

  return output;
}
