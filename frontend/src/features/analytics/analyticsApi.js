import { baseApi } from '../../app/api/baseApi'

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSummary: build.query({
      query: (params = {}) => ({ url: '/analytics/summary/', params }),
      providesTags: ['Analytics'],
    }),
  }),
})

export const { useGetSummaryQuery } = analyticsApi
