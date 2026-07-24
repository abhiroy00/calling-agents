import { baseApi } from "@/app/api/baseApi";
import type { UserRole } from "@/features/auth/authSlice";

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
}

export interface Tenant {
  id: number;
  name: string;
  plan: "starter" | "growth" | "scale";
  seats: number;
  minutes_quota: number;
  minutes_used: number;
  status: "active" | "trial" | "suspended";
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  actor: number | null;
  actor_email: string;
  action: string;
  resource: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}

export interface SystemHealth {
  counts: {
    users: number;
    active_users: number;
    leads: number;
    campaigns: number;
    calls: number;
    meetings: number;
  };
  services: { name: string; status: "operational" | "degraded" | "down"; detail: string }[];
  generated_at: string;
}

export interface RolesResponse {
  roles: { key: UserRole; label: string; description: string; user_count: number }[];
  permissions: { key: string; roles: UserRole[] }[];
}

interface Paginated<T> {
  count: number;
  results: T[];
}

// DRF ListAPIViews are paginated; APIViews (system/roles) are not.
const unwrap = <T>(r: Paginated<T> | T[]): T[] => (Array.isArray(r) ? r : r.results);

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // --- Users ---
    getAdminUsers: build.query<AdminUser[], { search?: string; role?: string } | void>({
      query: (args) => {
        const params = new URLSearchParams({ page_size: "200" });
        if (args?.search) params.set("search", args.search);
        if (args?.role) params.set("role", args.role);
        return `/admin/users/?${params.toString()}`;
      },
      transformResponse: unwrap<AdminUser>,
      providesTags: (result) =>
        result
          ? [
              ...result.map((u) => ({ type: "AdminUser" as const, id: u.id })),
              { type: "AdminUser" as const, id: "LIST" },
            ]
          : [{ type: "AdminUser" as const, id: "LIST" }],
    }),
    createAdminUser: build.mutation<AdminUser, Partial<AdminUser> & { password: string }>({
      query: (body) => ({ url: "/admin/users/", method: "POST", body }),
      invalidatesTags: [
        { type: "AdminUser", id: "LIST" },
        { type: "AdminRoles", id: "ALL" },
        { type: "AuditLog", id: "LIST" },
      ],
    }),
    updateAdminUser: build.mutation<
      AdminUser,
      { id: number; body: Partial<AdminUser> & { password?: string } }
    >({
      query: ({ id, body }) => ({ url: `/admin/users/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AdminUser", id },
        { type: "AdminUser", id: "LIST" },
        { type: "AdminRoles", id: "ALL" },
        { type: "AuditLog", id: "LIST" },
      ],
    }),
    deactivateAdminUser: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/users/${id}/`, method: "DELETE" }),
      invalidatesTags: [
        { type: "AdminUser", id: "LIST" },
        { type: "AuditLog", id: "LIST" },
      ],
    }),

    // --- Tenants ---
    getTenants: build.query<Tenant[], void>({
      query: () => "/admin/tenants/?page_size=200",
      transformResponse: unwrap<Tenant>,
      providesTags: (result) =>
        result
          ? [
              ...result.map((t) => ({ type: "Tenant" as const, id: t.id })),
              { type: "Tenant" as const, id: "LIST" },
            ]
          : [{ type: "Tenant" as const, id: "LIST" }],
    }),
    createTenant: build.mutation<Tenant, Partial<Tenant>>({
      query: (body) => ({ url: "/admin/tenants/", method: "POST", body }),
      invalidatesTags: [
        { type: "Tenant", id: "LIST" },
        { type: "AuditLog", id: "LIST" },
      ],
    }),
    updateTenant: build.mutation<Tenant, { id: number; body: Partial<Tenant> }>({
      query: ({ id, body }) => ({ url: `/admin/tenants/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Tenant", id },
        { type: "Tenant", id: "LIST" },
        { type: "AuditLog", id: "LIST" },
      ],
    }),
    deleteTenant: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/tenants/${id}/`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Tenant", id: "LIST" },
        { type: "AuditLog", id: "LIST" },
      ],
    }),

    // --- Audit / System / Roles ---
    getAuditLog: build.query<AuditLogEntry[], { search?: string } | void>({
      query: (args) => {
        const params = new URLSearchParams({ page_size: "200" });
        if (args?.search) params.set("search", args.search);
        return `/admin/audit/?${params.toString()}`;
      },
      transformResponse: unwrap<AuditLogEntry>,
      providesTags: [{ type: "AuditLog", id: "LIST" }],
    }),
    getSystemHealth: build.query<SystemHealth, void>({
      query: () => "/admin/system/",
      providesTags: [{ type: "AdminSystem", id: "ALL" }],
    }),
    getRoles: build.query<RolesResponse, void>({
      query: () => "/admin/roles/",
      providesTags: [{ type: "AdminRoles", id: "ALL" }],
    }),
  }),
});

export const {
  useGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useDeactivateAdminUserMutation,
  useGetTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useDeleteTenantMutation,
  useGetAuditLogQuery,
  useGetSystemHealthQuery,
  useGetRolesQuery,
} = adminApi;
