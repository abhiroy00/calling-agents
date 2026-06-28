import { useState, useRef } from 'react'
import { parseFile } from './leadUtils'
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
      <h2 className="text-lg font-semibold mb-4">Upload Leads</h2>
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
