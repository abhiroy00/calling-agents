import { baseApi } from "@/app/api/baseApi";

export const campaignsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCampaigns: build.query<any, void>({
      query: () => "/campaigns/",
      providesTags: ["Campaign"],
    }),
    getCampaign: build.query<any, string | number>({
      query: (id) => `/campaigns/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Campaign", id }],
    }),
    createCampaign: build.mutation<any, any>({
      query: (body) => ({ url: "/campaigns/", method: "POST", body }),
      invalidatesTags: ["Campaign"],
    }),
    updateCampaign: build.mutation<any, any>({
      query: ({ id, ...body }) => ({ url: `/campaigns/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["Campaign"],
    }),
    deleteCampaign: build.mutation<any, string | number>({
      query: (id) => ({ url: `/campaigns/${id}/`, method: "DELETE" }),
      invalidatesTags: ["Campaign"],
    }),
    startCampaign: build.mutation<any, string | number>({
      query: (id) => ({ url: `/campaigns/${id}/start/`, method: "POST" }),
      invalidatesTags: ["Campaign"],
    }),
    pauseCampaign: build.mutation<any, string | number>({
      query: (id) => ({ url: `/campaigns/${id}/pause/`, method: "POST" }),
      invalidatesTags: ["Campaign"],
    }),
    stopCampaign: build.mutation<any, string | number>({
      query: (id) => ({ url: `/campaigns/${id}/stop/`, method: "POST" }),
      invalidatesTags: ["Campaign"],
    }),
    addLeadsToCampaign: build.mutation<
      { added: number },
      {
        id: string | number;
        lead_ids?: (string | number)[];
        all?: boolean;
        search?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/campaigns/${id}/add-leads/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Campaign"],
    }),
  }),
});

export const {
  useGetCampaignsQuery,
  useGetCampaignQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  useStartCampaignMutation,
  usePauseCampaignMutation,
  useStopCampaignMutation,
  useAddLeadsToCampaignMutation,
} = campaignsApi;
