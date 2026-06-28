import { useState } from 'react'
import LeadsTable from '../features/leads/LeadsTable'
import LeadUpload from '../features/leads/LeadUpload'

export default function LeadsPage() {
  const [showUpload, setShowUpload] = useState(false)

  if (showUpload) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Upload Leads</h1>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl">
          <LeadUpload onClose={() => setShowUpload(false)} />
        </div>
      </div>
    )
  }

  return <LeadsTable onUpload={() => setShowUpload(true)} />
}
