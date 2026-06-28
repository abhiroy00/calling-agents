import { baseApi } from '../../app/api/baseApi'

export const leadsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLeads: build.query({
      query: (params = {}) => ({ url: '/leads/', params }),
      providesTags: ['Lead'],
    }),
    bulkUpload: build.mutation({
      query: (leads) => ({ url: '/leads/bulk/', method: 'POST', body: leads }),
      invalidatesTags: ['Lead'],
    }),
  }),
})

export const { useGetLeadsQuery, useBulkUploadMutation } = leadsApi
