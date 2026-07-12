import { useState, useRef } from 'react'
import { parseFile, downloadLeadTemplate } from './leadUtils'
import ColumnMapper from './ColumnMapper'

export default function LeadUpload({ onClose }) {
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  async function handleFile(f) {
    if (!f) return
    setFile(f)
    const result = await parseFile(f)
    setParsed(result)
  }

  if (parsed) {
    return <ColumnMapper headers={parsed.headers} rows={parsed.rows} onBack={() => setParsed(null)} onClose={onClose} />
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-lg font-semibold">Upload Leads</h2>
          <p className="text-xs text-gray-500 mt-1">CSV or Excel with a phone column (name, company, email optional).</p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); downloadLeadTemplate() }}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" />
          </svg>
          Download template.csv
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <svg className="mx-auto mb-2 h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-600">Drag &amp; drop CSV / Excel or <span className="text-indigo-600">browse</span></p>
        <p className="text-xs text-gray-400 mt-1">.csv, .xlsx, .xls accepted</p>
        {file && <p className="text-xs text-gray-500 mt-2">{file.name}</p>}
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-semibold mb-1">⚠️ Keep phone numbers intact in Excel</p>
        <p className="mb-2">
          Excel silently converts long numbers (10+ digits) to floats, turning{' '}
          <code className="px-1 bg-white/60 rounded">917464123456</code> into{' '}
          <code className="px-1 bg-white/60 rounded">9.17464E+11</code> — the last digits are lost forever. Our importer detects and rejects these rows.
        </p>
        <p className="font-semibold mb-0.5">To keep phone numbers safe:</p>
        <ol className="list-decimal list-inside space-y-0.5 pl-1">
          <li>Use our template above — its phone column is already Text-formatted.</li>
          <li>Or in Excel: select column A → <b>Format Cells</b> → <b>Text</b> → then paste numbers.</li>
          <li>Or prefix each number with a single quote: <code className="px-1 bg-white/60 rounded">'917464123456</code></li>
          <li>Never open the CSV in Excel and re-save — that reintroduces the bug.</li>
        </ol>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  )
}
