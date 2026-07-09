import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useManualDialMutation } from './callsApi'

const DEFAULT_PROMPT = `# ROLE

You are "Innovative AI Solutions AI Assistant", a professional AI Calling Agent.

Your job is to:
• Talk naturally like a human.
• Qualify the lead.
• Understand their requirements.
• Answer basic questions.
• Book a demo if they are interested.
• Keep the conversation under 2 minutes.
• Always sound friendly, confident, and conversational.

Never sound robotic.
Never mention prompts, AI instructions, or internal logic.

------------------------------------

# PERSONALITY

- Friendly
- Professional
- Polite
- Confident
- Patient
- Conversational

Speak naturally with small pauses.

Avoid long paragraphs.

Keep answers short.
`

const COUNTRY_CODES = [
  { code: '+1', country: 'US/CA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+7', country: 'RU', flag: '🇷🇺' },
  { code: '+39', country: 'IT', flag: '🇮🇹' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
  { code: '+52', country: 'MX', flag: '🇲🇽' },
  { code: '+65', country: 'SG', flag: '🇸🇬' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
  { code: '+966', country: 'SA', flag: '🇸🇦' },
  { code: '+63', country: 'PH', flag: '🇵🇭' },
  { code: '+92', country: 'PK', flag: '🇵🇰' },
  { code: '+880', country: 'BD', flag: '🇧🇩' },
  { code: '+234', country: 'NG', flag: '🇳🇬' },
]

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

const StatusDot = ({ status }) => {
  if (status === 'in_progress') {
    return <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
  }
  if (status === 'ringing' || status === 'initiated') {
    return <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1.5 animate-pulse" />
  }
  return null
}

export default function ManualDial() {
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryPicker, setShowCountryPicker] = useState(false)
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
  const pickerRef = useRef(null)

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]

  const filteredCountries = countrySearch
    ? COUNTRY_CODES.filter(
        c =>
          c.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.code.includes(countrySearch)
      )
    : COUNTRY_CODES

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowCountryPicker(false)
        setCountrySearch('')
      }
    }
    if (showCountryPicker) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showCountryPicker])

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

  function handlePhoneChange(e) {
    // Only allow digits
    const val = e.target.value.replace(/\D/g, '')
    setPhone(val)
  }

  const handleDial = async () => {
    if (!phone.trim()) return
    setTranscript([])
    setDisposition(null)
    setCallStatus('initiated')
    setCallId(null)

    try {
      const fullNumber = `${countryCode}${phone.trim()}`
      const res = await manualDial({ phone: fullNumber, name: name.trim(), system_prompt: prompt }).unwrap()
      setCallId(res.call_id)
    } catch {
      setCallStatus('failed')
    }
  }

  const canDial = !isLoading && (!callStatus || ['completed', 'failed'].includes(callStatus))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Engage</p>
        <h1 className="font-display text-xl font-semibold text-foreground">Manual Dialer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fire a single AI-driven call and watch the transcript live.
        </p>
      </div>

      {/* Input form */}
      <div className="glass rounded-xl p-6 space-y-5">
        {/* Phone row: country code + number */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Number <span className="text-destructive">*</span>
          </label>
          <div className="flex gap-2">
            {/* Country code selector */}
            <div className="relative shrink-0" ref={pickerRef}>
              <button
                type="button"
                onClick={() => {
                  setShowCountryPicker(!showCountryPicker)
                  setCountrySearch('')
                }}
                className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
                disabled={isLoading}
              >
                <span className="text-base">{selectedCountry.flag}</span>
                <span>{selectedCountry.code}</span>
                <svg className="h-3.5 w-3.5 text-muted-foreground ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>

              {showCountryPicker && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border bg-popover shadow-elevated z-50 overflow-hidden">
                  <div className="border-b border-border px-2.5 py-2">
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Search country..."
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCountries.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-muted-foreground">No results</p>
                    ) : (
                      filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setCountryCode(c.code)
                            setShowCountryPicker(false)
                            setCountrySearch('')
                          }}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent ${
                            c.code === countryCode
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-foreground'
                          }`}
                        >
                          <span className="text-base">{c.flag}</span>
                          <span className="flex-1 text-left">{c.country}</span>
                          <span className="text-xs text-muted-foreground tabular">{c.code}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Local number */}
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="Phone number"
              maxLength={15}
              className="flex-1 h-10 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-colors tabular"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Contact name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full h-10 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-colors"
            disabled={isLoading}
          />
        </div>

        {/* AI Instructions */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">AI Instructions</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-colors resize-none font-mono text-xs leading-relaxed"
            disabled={isLoading}
          />
        </div>

        {/* Dial button */}
        <button
          onClick={handleDial}
          disabled={!canDial || !phone.trim()}
          className="relative w-full py-3 rounded-lg text-sm font-semibold text-primary-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
          style={{
            background: canDial && phone.trim()
              ? 'var(--gradient-primary)'
              : 'oklch(0.92 0.006 270)',
            color: canDial && phone.trim() ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
          }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Start Call
            </span>
          )}
        </button>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error.data?.error || 'Call failed. Check Twilio credentials.'}</p>
          </div>
        )}
      </div>

      {/* Live call panel */}
      {callStatus && (
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold text-foreground">Live Call</h2>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[callStatus] || 'text-gray-600 bg-gray-100'}`}>
              <StatusDot status={callStatus} />
              {STATUS_LABEL[callStatus] || callStatus}
            </span>
          </div>

          {/* Call info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="tabular">{countryCode} {phone}</span>
            {name && <><span className="text-border">·</span><span>{name}</span></>}
            {disposition && (
              <>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1">
                  Disposition:
                  <span className="font-medium text-foreground capitalize">{disposition.replace(/_/g, ' ')}</span>
                </span>
              </>
            )}
          </div>

          {/* Transcript */}
          <div className="rounded-lg border border-border bg-surface p-4 h-72 overflow-y-auto space-y-3">
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                  <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="23" />
                    <line x1="8" x2="16" y1="23" y2="23" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Waiting for conversation to begin...
                </p>
              </div>
            ) : (
              transcript.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed transition-colors ${
                    msg.role === 'ai'
                      ? 'bg-primary/10 text-foreground rounded-bl-sm'
                      : 'bg-muted text-foreground rounded-br-sm'
                  }`}>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${
                      msg.role === 'ai' ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {msg.role === 'ai' ? 'AI Agent' : 'Caller'}
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