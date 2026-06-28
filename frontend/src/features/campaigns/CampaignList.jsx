import { useState } from 'react'
import { useGetCampaignsQuery, useStartCampaignMutation, usePauseCampaignMutation, useStopCampaignMutation } from './campaignsApi'
import StatusBadge from '../../components/StatusBadge'
import CampaignBuilder from './CampaignBuilder'

export default function CampaignList() {
  const { data, isFetching } = useGetCampaignsQuery()
  const [start] = useStartCampaignMutation()
  const [pause] = usePauseCampaignMutation()
  const [stop] = useStopCampaignMutation()
  const [showBuilder, setShowBuilder] = useState(false)

  const campaigns = data?.results || data || []

  if (showBuilder) return <CampaignBuilder onClose={() => setShowBuilder(false)} />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500">{campaigns.length} campaigns</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + New campaign
        </button>
      </div>

      <div className="space-y-3">
        {isFetching && <p className="text-gray-400 text-sm">Loading…</p>}
        {!isFetching && campaigns.length === 0 && (
          <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
            No campaigns yet — create one to start calling
          </div>
        )}
        {campaigns.map((c) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {c.lead_count} leads · {c.rate_limit_per_min}/min · {c.calling_window_start}–{c.calling_window_end}
              </p>
            </div>
            <StatusBadge status={c.status} />
            <div className="flex gap-2">
              {c.status === 'running' && (
                <button onClick={() => pause(c.id)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Pause</button>
              )}
              {(c.status === 'draft' || c.status === 'paused') && (
                <button onClick={() => start(c.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">Start</button>
              )}
              {c.status !== 'stopped' && c.status !== 'completed' && (
                <button onClick={() => stop(c.id)} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50">Stop</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
