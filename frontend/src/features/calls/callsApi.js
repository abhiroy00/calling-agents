import { baseApi } from '../../app/api/baseApi'

export const callsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCalls: build.query({
      query: (params = {}) => ({ url: '/calls/', params }),
      providesTags: ['Call'],
    }),
    getCall: build.query({
      query: (id) => `/calls/${id}/`,
      providesTags: (r, e, id) => [{ type: 'Call', id }],
    }),
    manualDial: build.mutation({
      query: (body) => ({ url: '/calls/manual-dial/', method: 'POST', body }),
      invalidatesTags: ['Call'],
    }),
  }),
})

export const { useGetCallsQuery, useGetCallQuery, useManualDialMutation } = callsApi
