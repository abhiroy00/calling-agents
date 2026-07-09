import { baseApi } from "@/app/api/baseApi";

export const callsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCalls: build.query<any, Record<string, any> | void>({
      query: (params = {}) => ({ url: "/calls/", params: params || {} }),
      providesTags: ["Call"],
    }),
    getCall: build.query<any, string | number>({
      query: (id) => `/calls/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Call", id }],
    }),
    manualDial: build.mutation<{ call_id: string | number }, any>({
      query: (body) => ({ url: "/calls/manual-dial/", method: "POST", body }),
      invalidatesTags: ["Call"],
    }),
  }),
});

export const { useGetCallsQuery, useGetCallQuery, useManualDialMutation } = callsApi;
