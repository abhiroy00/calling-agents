import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface LiveCall {
  call_id: string | number;
  status?: string;
  disposition?: string;
  transcript?: { role: string; text: string }[];
}

interface CallsState {
  liveCalls: Record<string, LiveCall>;
  stats: { dialed: number; connected: number; live: number };
}

const initialState: CallsState = {
  liveCalls: {},
  stats: { dialed: 0, connected: 0, live: 0 },
};

const callsSlice = createSlice({
  name: "calls",
  initialState,
  reducers: {
    upsertLiveCall(state, { payload }: PayloadAction<LiveCall>) {
      const { call_id, status, disposition } = payload;
      const key = String(call_id);
      state.liveCalls[key] = {
        ...(state.liveCalls[key] || { call_id }),
        call_id,
        status,
        ...(disposition ? { disposition } : {}),
      };
    },
    appendTranscript(
      state,
      { payload }: PayloadAction<{ call_id: string | number; role: string; text: string }>,
    ) {
      const key = String(payload.call_id);
      if (!state.liveCalls[key]) state.liveCalls[key] = { call_id: payload.call_id };
      if (!state.liveCalls[key].transcript) state.liveCalls[key].transcript = [];
      state.liveCalls[key].transcript!.push({ role: payload.role, text: payload.text });
    },
    clearLiveCalls(state) {
      state.liveCalls = {};
    },
  },
});

export const { upsertLiveCall, appendTranscript, clearLiveCalls } = callsSlice.actions;
export default callsSlice.reducer;
