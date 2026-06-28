import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from './api/baseApi'
import authReducer from '../features/auth/authSlice'
import callsReducer from '../features/calls/callsSlice'

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    calls: callsReducer,
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
})
