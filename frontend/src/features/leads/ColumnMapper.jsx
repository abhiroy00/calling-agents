import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { validateRows } from './leadUtils'
import { useBulkUploadMutation } from './leadsApi'
import UploadPreview from './UploadPreview'
import { trackLeads, selectLeadsRemaining } from '@/features/billing/billingSlice'
import { toast } from 'sonner'

const SCHEMA_FIELDS = ['phone', 'name', 'company', 'email', '__ignore__']

export default function ColumnMapper({ headers, rows, onBack, onClose }) {
  const [mapping, setMapping] = useState(() => {
    const m = {}
    headers.forEach((h) => {
      const lower = h.toLowerCase()
      if (lower.includes('phone') || lower.includes('mobile') || lower.includes('cell')) m[h] = 'phone'
      else if (lower.includes('name')) m[h] = 'name'
      else if (lower.includes('company') || lower.includes('org')) m[h] = 'company'
      else if (lower.includes('email')) m[h] = 'email'
      else m[h] = '__ignore__'
    })
    return m
  })
  const [preview, setPreview] = useState(null)
  const [bulkUpload, { isLoading }] = useBulkUploadMutation()
  const [result, setResult] = useState(null)
  const dispatch = useDispatch()
  const leadsRemaining = useSelector(selectLeadsRemaining)

  function buildLeadMapping() {
    const leadMapping = {}
    for (const [col, field] of Object.entries(mapping)) {
      if (field !== '__ignore__') leadMapping[field] = col
    }
    return leadMapping
  }

  function handlePreview() {
    const leadMapping = buildLeadMapping()
    if (!leadMapping.phone) return alert('Map at least one column to "phone"')
    setPreview(validateRows(rows, leadMapping))
  }

  async function handleImport() {
    if (preview.valid.length > leadsRemaining) {
      toast.error(`Only ${leadsRemaining} leads left in your quota. Upgrade or import fewer.`)
      return
    }
    const data = await bulkUpload(preview.valid).unwrap()
    dispatch(trackLeads(data.created || preview.valid.length))
    setResult(data)
  }

  if (result) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg font-semibold text-green-600 mb-2">Import complete</p>
        <p className="text-sm text-gray-600">{result.created} leads created · {result.duplicates} duplicates</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Done</button>
      </div>
    )
  }

  if (preview) {
    return <UploadPreview preview={preview} onBack={() => setPreview(null)} onImport={handleImport} loading={isLoading} />
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-1">Map columns</h2>
      <p className="text-sm text-gray-500 mb-4">Match your file headers to the CRM schema</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {headers.map((h) => (
          <div key={h} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-500 flex-1 truncate">"{h}"</span>
            <span className="text-gray-400">→</span>
            <select
              value={mapping[h]}
              onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
              className="border-0 bg-transparent text-sm font-medium focus:outline-none"
            >
              {SCHEMA_FIELDS.map((f) => (
                <option key={f} value={f}>{f === '__ignore__' ? 'ignore' : f}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Back</button>
        <button onClick={handlePreview} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Preview →</button>
      </div>
    </div>
  )
}
