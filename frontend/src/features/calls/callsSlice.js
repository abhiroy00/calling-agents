import { createSlice } from '@reduxjs/toolkit'

const callsSlice = createSlice({
  name: 'calls',
  initialState: {
    liveCalls: {},
    stats: { dialed: 0, connected: 0, live: 0 },
  },
  reducers: {
    upsertLiveCall(state, { payload }) {
      const { call_id, status, disposition } = payload
      state.liveCalls[call_id] = {
        ...(state.liveCalls[call_id] || {}),
        call_id,
        status,
        ...(disposition ? { disposition } : {}),
      }
    },
    appendTranscript(state, { payload }) {
      const { call_id, role, text } = payload
      if (!state.liveCalls[call_id]) state.liveCalls[call_id] = {}
      if (!state.liveCalls[call_id].transcript) state.liveCalls[call_id].transcript = []
      state.liveCalls[call_id].transcript.push({ role, text })
    },
    clearLiveCalls(state) {
      state.liveCalls = {}
    },
  },
})

export const { upsertLiveCall, appendTranscript, clearLiveCalls } = callsSlice.actions
export default callsSlice.reducer
