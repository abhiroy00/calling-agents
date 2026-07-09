import { baseApi } from "@/app/api/baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<
      { access: string; refresh: string; user: { id: string; name?: string; email?: string } },
      { email: string; password: string }
    >({
      query: (body) => ({ url: "/auth/login/", method: "POST", body }),
    }),
    me: build.query({ query: () => "/auth/me/" }),
  }),
});

export const { useLoginMutation, useMeQuery } = authApi;
