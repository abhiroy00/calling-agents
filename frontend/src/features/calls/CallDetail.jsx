import { useGetCallQuery } from './callsApi'
import StatusBadge from '../../components/StatusBadge'

export default function CallDetail({ id, onBack }) {
  const { data: call, isFetching } = useGetCallQuery(id)

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to history
      </button>

      {isFetching && <p className="text-gray-400">Loading…</p>}
      {call && (
        <div>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{call.lead_name || 'Unknown'}</h1>
              <p className="text-sm text-gray-400 font-mono">{call.lead_phone}</p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={call.status} />
              <StatusBadge status={call.disposition} />
            </div>
          </div>

          {call.recording_url && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Recording</p>
              <audio controls src={call.recording_url} className="w-full" />
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Transcript</p>
            <div className="space-y-3">
              {(call.transcripts || []).length === 0 && (
                <p className="text-sm text-gray-400">No transcript available</p>
              )}
              {(call.transcripts || []).map((t) => (
                <div key={t.id} className={`flex gap-3 ${t.role === 'ai' ? '' : 'flex-row-reverse'}`}>
                  <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    t.role === 'ai' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {t.role === 'ai' ? 'AI' : 'C'}
                  </div>
                  <div className={`max-w-lg rounded-xl px-4 py-2 text-sm ${
                    t.role === 'ai' ? 'bg-indigo-50 text-gray-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {t.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
