import { createSlice } from '@reduxjs/toolkit'

const stored = (() => {
  try { return JSON.parse(localStorage.getItem('auth') || 'null') } catch { return null }
})()

const authSlice = createSlice({
  name: 'auth',
  initialState: stored || { token: null, refresh: null, user: null },
  reducers: {
    setCredentials(state, { payload }) {
      state.token = payload.access
      state.refresh = payload.refresh
      state.user = payload.user
      localStorage.setItem('auth', JSON.stringify(state))
    },
    logout(state) {
      state.token = null
      state.refresh = null
      state.user = null
      localStorage.removeItem('auth')
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
