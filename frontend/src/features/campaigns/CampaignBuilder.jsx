import { useState } from 'react'
import { useCreateCampaignMutation } from './campaignsApi'

export default function CampaignBuilder({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    system_prompt: 'You are a helpful AI sales assistant. Start by greeting the customer and introduce yourself as calling on behalf of [Company Name]. Ask about their current needs and see if our product/service could help them.',
    calling_window_start: '09:00:00',
    calling_window_end: '18:00:00',
    rate_limit_per_min: 5,
  })
  const [create, { isLoading, error }] = useCreateCampaignMutation()

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await create(form).unwrap()
      onClose()
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">New Campaign</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="June Outreach"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calling window start</label>
            <input
              type="time"
              value={form.calling_window_start.slice(0, 5)}
              onChange={(e) => setForm({ ...form, calling_window_start: e.target.value + ':00' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calling window end</label>
            <input
              type="time"
              value={form.calling_window_end.slice(0, 5)}
              onChange={(e) => setForm({ ...form, calling_window_end: e.target.value + ':00' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rate limit (calls/minute)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={form.rate_limit_per_min}
            onChange={(e) => setForm({ ...form, rate_limit_per_min: parseInt(e.target.value) })}
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AI system prompt / script</label>
          <textarea
            rows={8}
            value={form.system_prompt}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">This is sent as the system prompt to GPT-4o for every call in this campaign.</p>
        </div>

        {error && <p className="text-sm text-red-600">Failed to create campaign</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={isLoading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Creating…' : 'Create campaign'}
          </button>
        </div>
      </form>
    </div>
  )
}
