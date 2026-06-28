import { useState } from 'react'
import { useGetLeadsQuery } from './leadsApi'
import StatusBadge from '../../components/StatusBadge'

export default function LeadsTable({ onUpload }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isFetching } = useGetLeadsQuery({ search, page })

  const leads = data?.results || []
  const count = data?.count || 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">{count} total</p>
        </div>
        <button
          onClick={onUpload}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Upload leads
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by name, phone, company…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Company</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Added</th>
            </tr>
          </thead>
          <tbody>
            {isFetching && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!isFetching && leads.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No leads yet — upload a CSV</td></tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{lead.phone}</td>
                <td className="px-4 py-3">{lead.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{lead.company || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                <td className="px-4 py-3 text-gray-400">{new Date(lead.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {count > 50 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>Page {page}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <button disabled={leads.length < 50} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
