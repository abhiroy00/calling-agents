/**
 * Regression tests: bad-credential login must return the 401 verbatim,
 * must NOT trigger the refresh flow, and must NOT rewrite auth state —
 * even when a stale refresh token is present in the store.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/app/api/baseApi";
import authReducer, { setCredentials, logout } from "@/features/auth/authSlice";
import { authApi } from "@/features/auth/authApi";

function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (g) => g().concat(baseApi.middleware),
  });
}

type FetchArgs = Parameters<typeof fetch>;
type Handler = (...args: FetchArgs) => Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn>;
let handlers: Handler[];

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  handlers = [];
  fetchMock = vi.fn(async (...args: FetchArgs) => {
    const handler = handlers.shift();
    if (!handler) throw new Error(`Unexpected fetch call: ${String(args[0])}`);
    return handler(...args);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("bad-credential login regression", () => {
  it("returns the 401 error verbatim to the caller", async () => {
    const store = makeStore();
    handlers.push(async () =>
      jsonResponse(401, { detail: "Invalid credentials" }),
    );

    const result = await store.dispatch(
      authApi.endpoints.login.initiate({
        email: "user@test.com",
        password: "wrong",
      }),
    );

    expect(result.error).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = result.error as any;
    expect(err.status).toBe(401);
    expect(err.data).toEqual({ detail: "Invalid credentials" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT call /auth/refresh even when a stale refresh token exists", async () => {
    const store = makeStore();
    // Seed a stale session — this is the exact scenario that used to
    // cause the intermittent login bug.
    store.dispatch(
      setCredentials({
        access: "stale-access",
        refresh: "stale-refresh",
        user: { id: "other-user", email: "other@test.com" },
      }),
    );

    handlers.push(async () =>
      jsonResponse(401, { detail: "Invalid credentials" }),
    );

    await store.dispatch(
      authApi.endpoints.login.initiate({
        email: "user@test.com",
        password: "wrong",
      }),
    );

    // Only one call — the login POST. Never a follow-up refresh POST.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const urls = fetchMock.mock.calls.map((c) => (c[0] instanceof Request ? c[0].url : String(c[0])));
    expect(urls.some((u) => u.includes("/auth/refresh"))).toBe(false);
    expect(urls[0]).toContain("/auth/login");
  });

  it("does NOT rewrite or clear auth state on a bad-credential 401", async () => {
    const store = makeStore();
    const seeded = {
      access: "stale-access",
      refresh: "stale-refresh",
      user: { id: "other-user", email: "other@test.com" },
    };
    store.dispatch(setCredentials(seeded));
    const before = store.getState().auth;

    handlers.push(async () =>
      jsonResponse(401, { detail: "Invalid credentials" }),
    );

    await store.dispatch(
      authApi.endpoints.login.initiate({
        email: "user@test.com",
        password: "wrong",
      }),
    );

    const after = store.getState().auth;
    expect(after.token).toBe(before.token);
    expect(after.refresh).toBe(before.refresh);
    expect(after.user).toEqual(before.user);
  });

  it("baseline: a 401 on a NON-auth endpoint still triggers the refresh flow", async () => {
    // Guards against a regression that would over-broaden the auth-endpoint
    // skip and break token refresh for the rest of the app.
    const store = makeStore();
    store.dispatch(
      setCredentials({
        access: "expired-access",
        refresh: "good-refresh",
        user: { id: "u1" },
      }),
    );

    // 1) protected call → 401
    handlers.push(async () => jsonResponse(401, { detail: "expired" }));
    // 2) refresh → new access
    handlers.push(async () =>
      jsonResponse(200, { access: "new-access" }),
    );
    // 3) retried protected call → 200
    handlers.push(async () => jsonResponse(200, { ok: true }));

    const testEndpoints = baseApi.injectEndpoints({
      endpoints: (b) => ({
        me: b.query<{ ok: boolean }, void>({ query: () => "/me/" }),
      }),
      overrideExisting: true,
    });

    const result = await store.dispatch(testEndpoints.endpoints.me.initiate());
    expect(result.data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map((c) => (c[0] instanceof Request ? c[0].url : String(c[0])));
    expect(urls[1]).toContain("/auth/refresh");
    expect(store.getState().auth.token).toBe("new-access");
  });

  it("logs out when refresh itself returns 401 on a protected call", async () => {
    const store = makeStore();
    store.dispatch(
      setCredentials({
        access: "expired-access",
        refresh: "stale-refresh",
        user: { id: "u1" },
      }),
    );

    handlers.push(async () => jsonResponse(401, { detail: "expired" }));
    // refresh endpoint also fails — this is an auth endpoint so it must
    // NOT itself recurse into the refresh flow.
    handlers.push(async () =>
      jsonResponse(401, { detail: "refresh rejected" }),
    );

    const testEndpoints = baseApi.injectEndpoints({
      endpoints: (b) => ({
        me2: b.query<unknown, void>({ query: () => "/me/" }),
      }),
      overrideExisting: true,
    });

    await store.dispatch(testEndpoints.endpoints.me2.initiate());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // logout cleared state
    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.refresh).toBeNull();
    expect(store.getState().auth.user).toBeNull();
    // Reference logout so the linter doesn't flag the import.
    expect(typeof logout).toBe("function");
  });
});
