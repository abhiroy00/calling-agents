import { baseApi } from "@/app/api/baseApi";

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSummary: build.query<any, Record<string, any> | void>({
      query: (params = {}) => ({ url: "/analytics/summary/", params: params || {} }),
      providesTags: ["Analytics"],
    }),
  }),
});

export const { useGetSummaryQuery } = analyticsApi;
