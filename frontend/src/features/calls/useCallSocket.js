import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { WS_URL } from '../../lib/constants'
import { upsertLiveCall, appendTranscript } from './callsSlice'

export default function useCallSocket() {
  const dispatch = useDispatch()
  const token = useSelector((s) => s.auth.token)
  const wsRef = useRef(null)

  useEffect(() => {
    if (!token) return

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/calls/?token=${token}`)
      wsRef.current = ws

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data)
        if (data.type === 'call.status') {
          dispatch(upsertLiveCall(data))
        } else if (data.type === 'call.transcript') {
          dispatch(appendTranscript(data))
        }
      }

      ws.onclose = (e) => {
        if (e.code !== 1000) {
          setTimeout(connect, 3000)
        }
      }
    }

    connect()
    return () => {
      wsRef.current?.close(1000)
    }
  }, [token, dispatch])
}
