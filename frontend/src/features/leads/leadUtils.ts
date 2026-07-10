import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, any>[];
}

export function parseFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      Papa.parse<Record<string, any>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => resolve({ headers: r.meta.fields || [], rows: r.data }),
        error: reject,
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
        const headers = data.length ? Object.keys(data[0]) : [];
        resolve({ headers, rows: data });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    }
  });
}

// The columns the importer understands. `phone` is required; the rest are
// optional. Any extra columns a user adds are kept as custom lead data.
export const TEMPLATE_HEADERS = ["phone", "name", "company", "email"] as const;

const TEMPLATE_SAMPLE_ROWS: string[][] = [
  ["+919876543210", "Aarav Sharma", "Acme Pvt Ltd", "aarav@acme.in"],
  ["9123456780", "Priya Patel", "Nova Retail", "priya.patel@nova.in"],
  ["+918000012345", "Rahul Verma", "", ""],
];

function csvCell(value: string): string {
  // Quote cells containing comma, quote, or newline; escape inner quotes.
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function triggerCsvDownload(lines: string[], filename: string): void {
  // Prepend a UTF-8 BOM so Excel opens non-ASCII names correctly.
  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const EXPORT_COLUMNS = ["name", "phone", "company", "email", "status", "created_at"] as const;

/** Export the given leads to a CSV file the user can re-import or archive. */
export function exportLeadsToCsv(leads: Record<string, any>[]): void {
  const lines = [
    EXPORT_COLUMNS.join(","),
    ...leads.map((lead) =>
      EXPORT_COLUMNS.map((col) => csvCell(String(lead[col] ?? ""))).join(","),
    ),
  ];
  const stamp = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(lines, `leads-export-${stamp}.csv`);
}

/** Build and download a sample CSV so users can see the expected import format. */
export function downloadLeadTemplate(): void {
  const lines = [
    TEMPLATE_HEADERS.join(","),
    ...TEMPLATE_SAMPLE_ROWS.map((row) => row.map(csvCell).join(",")),
  ];
  triggerCsvDownload(lines, "leads-import-template.csv");
}

// A phone is valid if it carries at least this many digits, matching the
// backend (BulkLeadRowSerializer.validate_phone strips non-digits, needs >= 7).
// We deliberately do NOT reject spaces, dashes, +, commas, etc. — Excel and
// contact exports add those, and the backend normalizes the number anyway.
const PHONE_MIN_DIGITS = 7;

export interface ValidatedRows {
  valid: any[];
  dupeCount: number;
  invalid: { row: any; reason: string }[];
}

export function validateRows(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
): ValidatedRows {
  const valid: any[] = [];
  const seenDigits = new Set<string>();
  const invalid: { row: any; reason: string }[] = [];

  for (const row of rows) {
    const phone = String(row[mapping.phone] ?? "").trim();
    const digits = phone.replace(/\D/g, "");

    if (!phone) {
      invalid.push({ row, reason: "Missing phone number" });
      continue;
    }
    if (digits.length < PHONE_MIN_DIGITS) {
      invalid.push({
        row,
        reason: `Only ${digits.length} digit${digits.length === 1 ? "" : "s"} found — need at least ${PHONE_MIN_DIGITS}`,
      });
      continue;
    }
    // Dedupe by digits so "+91 98765 43210" and "9876543210" count as one.
    if (seenDigits.has(digits)) continue;
    seenDigits.add(digits);

    const mapped: any = { phone, extra_data: {} };
    for (const [field, col] of Object.entries(mapping)) {
      if (field === "phone") continue;
      if (col === "__ignore__") continue;
      if (["name", "company", "email"].includes(field)) {
        mapped[field] = String(row[col] ?? "").trim();
      } else {
        mapped.extra_data[field] = row[col];
      }
    }
    valid.push(mapped);
  }

  const dupeCount = rows.length - valid.length - invalid.length;
  return { valid, dupeCount: Math.max(dupeCount, 0), invalid };
}
