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
    const asString = value.toString();
    // A safe integer round-trips through toString without scientific notation
    // and preserves full precision — trust it as-is. Truncation only happens
    // when the value is non-integer (Excel stored it as a float) OR when the
    // string form itself is in scientific notation.
    const truncated =
      !Number.isInteger(value) ||
      /[eE]/.test(asString) ||
      !Number.isSafeInteger(value);
    return { phone: value.toFixed(0), truncated };
  }

  let raw = String(value).trim();
  if (!raw) return { phone: "", truncated: false };

  // Unwrap Excel's ="..." text-literal wrapper (single or double quoted, with
  // optional surrounding whitespace). Our CSV template writes phones this way
  // to survive round-tripping through Excel.
  const litMatch = raw.match(/^=\s*(["'])(.*)\1\s*$/);
  if (litMatch) raw = litMatch[2].trim();
  // Also strip a plain leading apostrophe (Excel's text-force prefix).
  if (raw.startsWith("'")) raw = raw.slice(1).trim();
  if (!raw) return { phone: "", truncated: false };

  // Scientific-notation strings like "9.17464E+11" — precision already lost.
  if (/^-?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(raw)) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return { phone: "", truncated: false };
    return {
      phone: n.toFixed(0),
      truncated: countSignificantDigits(raw) < MIN_SIGNIFICANT_DIGITS,
    };
  }

  // Bare decimal like "9.17464E+11" written as "917464000000.0" — Excel
  // sometimes emits a trailing .0 for float cells. Strip it, but if there
  // were actual fractional digits the value is corrupt.
  const decMatch = raw.match(/^(-?\d+)\.(\d+)$/);
  if (decMatch) {
    if (/^0+$/.test(decMatch[2])) {
      raw = decMatch[1];
    } else {
      return { phone: raw, truncated: true };
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

/** Build and download a sample CSV so users can see the expected import
 * format. We wrap phone numbers in Excel's `="..."` text-literal syntax so
 * Excel does NOT convert long digits to floats (which would drop precision
 * and produce "9.17464E+11"). Our importer unwraps `="..."` automatically. */
export function downloadLeadTemplate(): void {
  const wrapPhone = (v: string) => (v ? `="${v.replace(/"/g, '""')}"` : "");
  const lines = [
    TEMPLATE_HEADERS.join(","),
    ...TEMPLATE_SAMPLE_ROWS.map(([phone, ...rest]) =>
      [wrapPhone(phone), ...rest.map(csvCell)].join(","),
    ),
  ];
  triggerCsvDownload(lines, "leads-import-template.csv");
}

// Backend (BulkLeadRowSerializer.validate_phone) strips non-digits and requires
// >= 7 digits. We normalize to E.164-ish form on the client so the payload is
// always clean regardless of how the source file formatted the number.
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15; // ITU-T E.164 hard cap
// Characters commonly used as visual separators in phone numbers.
const PHONE_ALLOWED_SEPARATORS = /[\s\-().\u00A0\u2000-\u200A\u202F\u2060\u2011\u2012\u2013\u2014\/]/g;

/**
 * Normalize a raw phone string ("+91 98765-43210", "(98765) 43210", "98765.43210")
 * into a compact form: an optional leading "+" followed by digits only.
 * Returns null if the input contains characters other than digits, "+",
 * or accepted separators — those are almost always typos or wrong columns.
 */
export function canonicalizePhone(raw: string): string | null {
  const stripped = raw.replace(PHONE_ALLOWED_SEPARATORS, "");
  // Allow a single leading "+" then digits only.
  if (!/^\+?\d+$/.test(stripped)) return null;
  return stripped;
}

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
    const { phone: rawPhone, truncated } = normalizePhoneValue(row[mapping.phone]);

    if (!rawPhone) {
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
    const canonical = canonicalizePhone(rawPhone);
    if (!canonical) {
      invalid.push({ row, reason: `Phone contains unsupported characters: "${rawPhone}"` });
      continue;
    }
    const digits = canonical.replace(/\D/g, "");
    if (digits.length < PHONE_MIN_DIGITS) {
      invalid.push({
        row,
        reason: `Only ${digits.length} digit${digits.length === 1 ? "" : "s"} found — need at least ${PHONE_MIN_DIGITS}`,
      });
      continue;
    }
    if (digits.length > PHONE_MAX_DIGITS) {
      invalid.push({
        row,
        reason: `Too many digits (${digits.length}) — max ${PHONE_MAX_DIGITS} per E.164`,
      });
      continue;
    }
    // Dedupe by digits so "+91 98765 43210" and "919876543210" count as one.
    if (seenDigits.has(digits)) continue;
    seenDigits.add(digits);

    const mapped: any = { phone: canonical, extra_data: {} };
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
