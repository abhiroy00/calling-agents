const colors = {
  new: 'bg-gray-100 text-gray-600',
  queued: 'bg-blue-100 text-blue-700',
  called: 'bg-purple-100 text-purple-700',
  interested: 'bg-green-100 text-green-700',
  not_interested: 'bg-red-100 text-red-700',
  callback: 'bg-yellow-100 text-yellow-700',
  do_not_call: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  running: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  stopped: 'bg-red-100 text-red-700',
  initiated: 'bg-gray-100 text-gray-600',
  ringing: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  no_answer: 'bg-gray-100 text-gray-500',
  busy: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
  voicemail: 'bg-purple-100 text-purple-700',
  pending: 'bg-gray-100 text-gray-400',
}

export default function StatusBadge({ status }) {
  if (!status) return null
  const cls = colors[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
