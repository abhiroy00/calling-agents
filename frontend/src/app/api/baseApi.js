import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { API_URL } from '../../lib/constants'
import { logout, setCredentials } from '../../features/auth/authSlice'

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)
  if (result.error?.status === 401) {
    const refresh = api.getState().auth.refresh
    if (refresh) {
      const refreshResult = await baseQuery(
        { url: '/auth/refresh/', method: 'POST', body: { refresh } },
        api,
        extraOptions
      )
      if (refreshResult.data) {
        api.dispatch(setCredentials({
          access: refreshResult.data.access,
          refresh,
          user: api.getState().auth.user,
        }))
        result = await baseQuery(args, api, extraOptions)
      } else {
        api.dispatch(logout())
      }
    } else {
      api.dispatch(logout())
    }
  }
  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Lead', 'Campaign', 'Call', 'Analytics'],
  endpoints: () => ({}),
})
