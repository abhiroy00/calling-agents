import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useManualDialMutation } from './callsApi'

const DEFAULT_PROMPT = 'You are a helpful AI sales assistant on a phone call. Be concise, friendly, and professional. Listen carefully and respond naturally.'

const STATUS_COLOR = {
  initiated: 'text-yellow-600 bg-yellow-50',
  ringing: 'text-blue-600 bg-blue-50',
  in_progress: 'text-green-600 bg-green-50',
  completed: 'text-gray-600 bg-gray-100',
  failed: 'text-red-600 bg-red-50',
}

const STATUS_LABEL = {
  initiated: 'Initiating...',
  ringing: 'Ringing',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
}

export default function ManualDial() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [callId, setCallId] = useState(null)
  const [callStatus, setCallStatus] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [disposition, setDisposition] = useState(null)

  const token = useSelector((state) => state.auth.token)
  const [manualDial, { isLoading, error }] = useManualDialMutation()
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!callId || !token) return

    const wsUrl = `${import.meta.env.VITE_WS_URL}/calls/?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (String(data.call_id) !== String(callId)) return

      if (data.type === 'call.status') {
        setCallStatus(data.status)
        if (data.disposition) setDisposition(data.disposition)
      }
      if (data.type === 'call.transcript') {
        setTranscript((prev) => [...prev, { role: data.role, text: data.text }])
      }
    }

    return () => ws.close()
  }, [callId, token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const handleDial = async () => {
    if (!phone.trim()) return
    setTranscript([])
    setDisposition(null)
    setCallStatus('initiated')
    setCallId(null)

    try {
      const res = await manualDial({ phone: phone.trim(), name: name.trim(), system_prompt: prompt }).unwrap()
      setCallId(res.call_id)
    } catch {
      setCallStatus('failed')
    }
  }

  const canDial = !isLoading && (!callStatus || ['completed', 'failed'].includes(callStatus))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Manual Dialer</h1>

      {/* Input form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919XXXXXXXXX"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AI Instructions</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleDial}
          disabled={!canDial || !phone.trim()}
          className="w-full py-3 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Connecting...' : '📞 Start Call'}
        </button>

        {error && (
          <p className="text-sm text-red-600">{error.data?.error || 'Call failed. Check Twilio credentials.'}</p>
        )}
      </div>

      {/* Live call panel */}
      {callStatus && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Live Call</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[callStatus] || 'text-gray-600 bg-gray-100'}`}>
              {callStatus === 'in_progress' && <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse" />}
              {STATUS_LABEL[callStatus] || callStatus}
            </span>
          </div>

          {disposition && (
            <div className="text-xs text-gray-500">
              Disposition: <span className="font-medium text-gray-700 capitalize">{disposition.replace('_', ' ')}</span>
            </div>
          )}

          {/* Transcript */}
          <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto space-y-3">
            {transcript.length === 0 ? (
              <p className="text-sm text-gray-400 text-center pt-8">Waiting for conversation...</p>
            ) : (
              transcript.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'ai'
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    <span className="text-xs font-medium block mb-1 opacity-60">
                      {msg.role === 'ai' ? 'AI' : 'Caller'}
                    </span>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  )
}
