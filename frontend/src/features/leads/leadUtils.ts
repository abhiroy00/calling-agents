import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, any>[];
}

/**
 * Convert any cell value into a phone-safe string. Excel loves to store long
 * phone numbers as floats, so `sheet_to_json` hands us values like
 * `9.17464e+11` (either as JS numbers or as strings when the cell was already
 * formatted that way). We must expand those back to plain digit strings before
 * anything downstream (validation, dedupe, API payload) touches them.
 */
export interface NormalizedPhone {
  phone: string;
  truncated: boolean; // true when the source cell lost precision (Excel float)
}

/**
 * A JS number carries ~15-17 significant digits. Phone numbers stored as
 * floats in Excel get rounded to the mantissa's precision — e.g. entering
 * 917464123456 and saving as CSV yields "9.17464E+11" which we can only
 * reconstruct as 917464000000. We treat any numeric-origin phone whose
 * significant-digit count is below this threshold as truncated.
 */
const MIN_SIGNIFICANT_DIGITS = 10;

function countSignificantDigits(raw: string): number {
  // Strip sign, decimal point, exponent, leading/trailing zeros of the mantissa.
  const m = raw.replace(/^-/, "").match(/^(\d+)(?:\.(\d+))?(?:[eE][+-]?\d+)?$/);
  if (!m) return Infinity;
  const digits = ((m[1] || "") + (m[2] || "")).replace(/^0+/, "").replace(/0+$/, "");
  return digits.length || 1;
}

export function normalizePhoneValue(value: unknown): NormalizedPhone {
  if (value == null) return { phone: "", truncated: false };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { phone: "", truncated: false };
    const sig = countSignificantDigits(value.toString());
    return { phone: value.toFixed(0), truncated: sig < MIN_SIGNIFICANT_DIGITS };
  }
  const raw = String(value).trim();
  if (!raw) return { phone: "", truncated: false };
  // Scientific-notation strings like "9.17464E+11"
  if (/^-?\d+(\.\d+)?[eE][+-]?\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) {
      return {
        phone: n.toFixed(0),
        truncated: countSignificantDigits(raw) < MIN_SIGNIFICANT_DIGITS,
      };
    }
  }
  return { phone: raw, truncated: false };
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
        // `raw: true` keeps numbers as JS numbers so normalizePhoneValue can
        // safely re-serialize them (formatted strings from `raw:false` would
        // preserve Excel's own scientific-notation display like "9.17E+11").
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "", raw: true });
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
    const { phone, truncated } = normalizePhoneValue(row[mapping.phone]);
    const digits = phone.replace(/\D/g, "");

    if (!phone) {
      invalid.push({ row, reason: "Missing phone number" });
      continue;
    }
    if (truncated) {
      invalid.push({
        row,
        reason: "Phone lost precision in Excel (scientific notation). Format the phone column as Text and re-save.",
      });
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
