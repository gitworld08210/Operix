/**
 * Tiny dependency-free CSV parser.
 *
 * Deliberately hand-rolled (no new runtime dependency) to keep the bulk-upload
 * endpoint installable-package-free in this sandbox. It supports the subset of
 * RFC 4180 that admin metadata sheets need:
 *   - comma-separated fields, newline-separated records (\n or \r\n)
 *   - double-quoted fields that may contain commas, newlines and quotes
 *   - escaped quotes inside a quoted field via doubling ("")
 *   - a leading header row mapped onto each subsequent row
 *
 * It does NOT attempt to infer types — every value comes back as a string, and
 * higher layers (zod schemas) coerce/validate. Empty trailing lines are
 * ignored. This is intentionally small and pure so it is unit-testable offline.
 */

/** Parse CSV text into an array of string-cell rows (including the header). */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote ("") -> literal quote.
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      // Handle CRLF: skip the CR, let the following LF end the row.
      i += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Flush the final field/row unless the input ended with a newline (in which
  // case field is "" and row is empty -> nothing pending) OR the file ended
  // exactly after a delimiter/quote leaving a trailing record.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
}

/**
 * Parse CSV text into an array of objects keyed by the header row. Header cell
 * names are trimmed. Rows that are entirely empty (a single blank cell) are
 * skipped so trailing blank lines don't create junk records.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((h) => h.trim());
  const records: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    // Skip fully-empty rows (e.g. a trailing blank line producing [""]).
    if (cells.length === 1 && cells[0].trim() === "") {
      continue;
    }
    const record: Record<string, string> = {};
    for (let c = 0; c < header.length; c += 1) {
      record[header[c]] = (cells[c] ?? "").trim();
    }
    records.push(record);
  }

  return records;
}
