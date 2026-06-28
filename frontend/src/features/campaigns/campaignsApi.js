import { baseApi } from '../../app/api/baseApi'

export const campaignsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCampaigns: build.query({
      query: () => '/campaigns/',
      providesTags: ['Campaign'],
    }),
    getCampaign: build.query({
      query: (id) => `/campaigns/${id}/`,
      providesTags: (r, e, id) => [{ type: 'Campaign', id }],
    }),
    createCampaign: build.mutation({
      query: (body) => ({ url: '/campaigns/', method: 'POST', body }),
      invalidatesTags: ['Campaign'],
    }),
    updateCampaign: build.mutation({
      query: ({ id, ...body }) => ({ url: `/campaigns/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Campaign'],
    }),
    deleteCampaign: build.mutation({
      query: (id) => ({ url: `/campaigns/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Campaign'],
    }),
    startCampaign: build.mutation({
      query: (id) => ({ url: `/campaigns/${id}/start/`, method: 'POST' }),
      invalidatesTags: ['Campaign'],
    }),
    pauseCampaign: build.mutation({
      query: (id) => ({ url: `/campaigns/${id}/pause/`, method: 'POST' }),
      invalidatesTags: ['Campaign'],
    }),
    stopCampaign: build.mutation({
      query: (id) => ({ url: `/campaigns/${id}/stop/`, method: 'POST' }),
      invalidatesTags: ['Campaign'],
    }),
    addLeadsToCampaign: build.mutation({
      query: ({ id, lead_ids }) => ({ url: `/campaigns/${id}/add-leads/`, method: 'POST', body: { lead_ids } }),
      invalidatesTags: ['Campaign'],
    }),
  }),
})

export const {
  useGetCampaignsQuery, useGetCampaignQuery, useCreateCampaignMutation,
  useUpdateCampaignMutation, useDeleteCampaignMutation,
  useStartCampaignMutation, usePauseCampaignMutation, useStopCampaignMutation,
  useAddLeadsToCampaignMutation,
} = campaignsApi
