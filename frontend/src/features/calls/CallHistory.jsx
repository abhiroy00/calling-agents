import { useState } from 'react'
import { useGetCallsQuery } from './callsApi'
import StatusBadge from '../../components/StatusBadge'
import CallDetail from './CallDetail'

export default function CallHistory() {
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const { data, isFetching } = useGetCallsQuery({ page })
  const calls = data?.results || data || []

  if (selectedId) return <CallDetail id={selectedId} onBack={() => setSelectedId(null)} />

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Call History</h1>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Lead</th>
              <th className="text-left px-4 py-3">Campaign</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Disposition</th>
              <th className="text-left px-4 py-3">Duration</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {isFetching && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
            {!isFetching && calls.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No calls yet</td></tr>}
            {calls.map((call) => (
              <tr key={call.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(call.id)}>
                <td className="px-4 py-3">
                  <p className="font-medium">{call.lead_name || '—'}</p>
                  <p className="text-xs text-gray-400 font-mono">{call.lead_phone}</p>
                </td>
                <td className="px-4 py-3 text-gray-500">{call.campaign_name || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={call.status} /></td>
                <td className="px-4 py-3"><StatusBadge status={call.disposition} /></td>
                <td className="px-4 py-3 text-gray-500">{call.duration ? `${call.duration}s` : '—'}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(call.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
