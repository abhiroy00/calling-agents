import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => resolve({ headers: r.meta.fields || [], rows: r.data }),
        error: reject,
      })
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const headers = data.length ? Object.keys(data[0]) : []
        resolve({ headers, rows: data })
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    }
  })
}

const PHONE_RE = /^[+\d\s\-().]{7,20}$/

export function validateRows(rows, mapping) {
  const valid = []
  const dupePhones = new Set()
  const invalid = []

  for (const row of rows) {
    const phone = String(row[mapping.phone] || '').trim()
    if (!PHONE_RE.test(phone)) {
      invalid.push({ row, reason: 'Invalid phone format' })
      continue
    }
    if (dupePhones.has(phone)) {
      continue
    }
    dupePhones.add(phone)
    const mapped = { phone, extra_data: {} }
    for (const [field, col] of Object.entries(mapping)) {
      if (field === 'phone') continue
      if (col === '__ignore__') continue
      if (['name', 'company', 'email'].includes(field)) {
        mapped[field] = String(row[col] || '').trim()
      } else {
        mapped.extra_data[field] = row[col]
      }
    }
    valid.push(mapped)
  }

  const dupeCount = rows.length - valid.length - invalid.length
  return { valid, dupeCount: Math.max(dupeCount, 0), invalid }
}
