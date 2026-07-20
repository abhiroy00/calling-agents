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
    endCall: build.mutation<{ call_id: string | number; status: string }, string | number>({
      query: (id) => ({ url: `/calls/${id}/end/`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Call", id }, "Call"],
    }),
    // Lazy: fetched only when the user hits play, so we don't hammer Exotel for
    // every row on page load. Returns a fresh (often presigned) recording URL.
    getRecordingUrl: build.query<{ recording_url: string; fresh: boolean }, string | number>({
      query: (id) => `/calls/${id}/recording/`,
    }),
    getNumberMetadata: build.query<any, string>({
      query: (phone) => ({ url: "/calls/number-metadata/", params: { phone } }),
    }),
  }),
});

export const {
  useGetCallsQuery,
  useGetCallQuery,
  useManualDialMutation,
  useEndCallMutation,
  useLazyGetRecordingUrlQuery,
  useLazyGetNumberMetadataQuery,
} = callsApi;
