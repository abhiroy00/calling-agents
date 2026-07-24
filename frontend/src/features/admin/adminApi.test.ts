/**
 * adminApi behaviour: list endpoints unwrap DRF pagination, non-list endpoints
 * pass through, requests carry the bearer token, and mutations use the right
 * verb/URL. fetch is mocked so no network is touched.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/app/api/baseApi";
import authReducer, { setCredentials } from "@/features/auth/authSlice";
import { adminApi } from "@/features/admin/adminApi";

function makeStore() {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (g) => g().concat(baseApi.middleware),
  });
  store.dispatch(
    setCredentials({ access: "test-token", refresh: "r", user: { role: "super_admin" } }),
  );
  return store;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function lastRequest() {
  const [url, options] = fetchMock.mock.calls.at(-1)!;
  const req = new Request(url as string, options as RequestInit);
  return req;
}

describe("adminApi list endpoints", () => {
  it("unwraps paginated user results into a plain array", async () => {
    const store = makeStore();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        count: 2,
        results: [
          {
            id: 1,
            email: "a@x.com",
            name: "A",
            role: "super_admin",
            is_active: true,
            is_staff: true,
            created_at: "2026-01-01",
          },
          {
            id: 2,
            email: "b@x.com",
            name: "B",
            role: "manager",
            is_active: true,
            is_staff: false,
            created_at: "2026-01-02",
          },
        ],
      }),
    );

    const result = await store.dispatch(adminApi.endpoints.getAdminUsers.initiate());

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data![0].email).toBe("a@x.com");

    const req = lastRequest();
    expect(req.url).toContain("/admin/users/");
    expect(req.url).toContain("page_size=200");
    expect(req.headers.get("authorization")).toBe("Bearer test-token");
  });

  it("passes search through as a query param", async () => {
    const store = makeStore();
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0, results: [] }));
    await store.dispatch(adminApi.endpoints.getAdminUsers.initiate({ search: "mgr" }));
    expect(lastRequest().url).toContain("search=mgr");
  });

  it("unwraps paginated audit results", async () => {
    const store = makeStore();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        count: 1,
        results: [
          {
            id: 5,
            actor: 1,
            actor_email: "root@x.com",
            action: "user.create",
            resource: "n@x.com",
            metadata: {},
            ip: null,
            created_at: "2026-01-01",
          },
        ],
      }),
    );
    const result = await store.dispatch(adminApi.endpoints.getAuditLog.initiate());
    expect(result.data).toHaveLength(1);
    expect(result.data![0].action).toBe("user.create");
  });
});

describe("adminApi non-paginated endpoints", () => {
  it("returns the system health object as-is", async () => {
    const store = makeStore();
    const payload = {
      counts: { users: 3, active_users: 3, leads: 0, campaigns: 0, calls: 0, meetings: 0 },
      services: [{ name: "Database", status: "operational", detail: "sqlite" }],
      generated_at: "2026-07-24T00:00:00Z",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));
    const result = await store.dispatch(adminApi.endpoints.getSystemHealth.initiate());
    expect(result.data).toEqual(payload);
    expect(result.data!.counts.users).toBe(3);
  });
});

describe("adminApi mutations", () => {
  it("creates a user with POST to /admin/users/", async () => {
    const store = makeStore();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          id: 9,
          email: "n@x.com",
          name: "N",
          role: "bd_executive",
          is_active: true,
          is_staff: false,
          created_at: "2026-01-01",
        },
        201,
      ),
    );
    await store.dispatch(
      adminApi.endpoints.createAdminUser.initiate({
        email: "n@x.com",
        name: "N",
        role: "bd_executive",
        password: "supersecret1",
      }),
    );
    const req = lastRequest();
    expect(req.method).toBe("POST");
    expect(req.url).toContain("/admin/users/");
  });

  it("deactivates a user with DELETE to /admin/users/:id/", async () => {
    const store = makeStore();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await store.dispatch(adminApi.endpoints.deactivateAdminUser.initiate(7));
    const req = lastRequest();
    expect(req.method).toBe("DELETE");
    expect(req.url).toContain("/admin/users/7/");
  });

  it("patches a tenant with PATCH to /admin/tenants/:id/", async () => {
    const store = makeStore();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 3,
        name: "Acme",
        plan: "growth",
        seats: 10,
        minutes_quota: 1000,
        minutes_used: 0,
        status: "suspended",
        created_at: "2026-01-01",
      }),
    );
    await store.dispatch(
      adminApi.endpoints.updateTenant.initiate({ id: 3, body: { status: "suspended" } }),
    );
    const req = lastRequest();
    expect(req.method).toBe("PATCH");
    expect(req.url).toContain("/admin/tenants/3/");
  });
});
