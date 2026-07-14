import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { API_URL } from "@/lib/constants";
import { logout, setCredentials } from "@/features/auth/authSlice";

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: { token: string | null } }).auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

function isAuthEndpoint(args: string | FetchArgs): boolean {
  const url = typeof args === "string" ? args : args.url;
  return url.startsWith("/auth/login") || url.startsWith("/auth/refresh");
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await baseQuery(args, api, extraOptions);
  // Never run the refresh dance for auth endpoints themselves — a bad-password
  // 401 on /auth/login/ must be reported as-is. Otherwise a stale refresh
  // token in storage would silently swap in another session and re-run the
  // login request under it, producing intermittent, unpredictable results.
  if (result.error?.status === 401 && !isAuthEndpoint(args)) {
    const state = api.getState() as { auth: { refresh: string | null; user: unknown } };
    const refresh = state.auth.refresh;
    if (refresh) {
      const refreshResult = await baseQuery(
        { url: "/auth/refresh/", method: "POST", body: { refresh } },
        api,
        extraOptions,
      );
      const data = refreshResult.data as { access?: string } | undefined;
      if (data?.access) {
        api.dispatch(
          setCredentials({
            access: data.access,
            refresh,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            user: (api.getState() as any).auth.user,
          }),
        );
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Lead", "Campaign", "Call", "Analytics"],
  endpoints: () => ({}),
});
