/**
 * Small dependency-free CSV parser (RFC 4180-ish).
 * Handles quoted fields, commas, and CRLF.
 */

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const matrix = parseMatrix(normalized);
  if (!matrix.length) return { headers: [], rows: [] };

  const headers = matrix[0].map((h) => h.trim());
  const rows = matrix
    .slice(1)
    .filter((row) => row.some((cell) => String(cell).trim().length > 0))
    .map((row) => {
      // Pad / trim to header length
      const next = headers.map((_, i) => (row[i] ?? '').trim());
      return next;
    });

  return { headers, rows };
}

function parseMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += ch;
  }

  // last field
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function rowsToObjects(headers: string[], rows: string[][]): Record<string, string>[] {
  return rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });
}
