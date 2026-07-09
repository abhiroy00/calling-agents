import { baseApi } from "@/app/api/baseApi";

export const leadsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLeads: build.query<any, Record<string, any> | void>({
      query: (params = {}) => ({ url: "/leads/", params: params || {} }),
      providesTags: ["Lead"],
    }),
    bulkUpload: build.mutation<{ created: number; duplicates: number }, any[]>({
      query: (leads) => ({ url: "/leads/bulk/", method: "POST", body: leads }),
      invalidatesTags: ["Lead"],
    }),
  }),
});

export const { useGetLeadsQuery, useBulkUploadMutation } = leadsApi;
