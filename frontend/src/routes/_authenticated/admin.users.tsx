import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { UserPlus, Search, Shield, ShieldCheck, Pencil, Power, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Modal, Field, inputCls } from "@/components/Modal";
import Forbidden from "@/components/Forbidden";
import { cn } from "@/lib/utils";
import { useIsSuperAdmin, useRole, ROLE_LABEL } from "@/features/admin/adminAccess";
import type { UserRole } from "@/features/auth/authSlice";
import {
  useGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useDeactivateAdminUserMutation,
  type AdminUser,
} from "@/features/admin/adminApi";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & roles — LeadGen+ Admin" },
      { name: "description", content: "Create, edit, and manage users and their roles." },
    ],
  }),
  component: UsersPage,
});

const roleStyles: Record<UserRole, string> = {
  super_admin: "border-primary/30 bg-primary/10 text-primary",
  manager: "border-info/30 bg-info/10 text-info",
  bd_executive: "border-border bg-muted text-foreground",
};

type Draft = {
  id?: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  password: string;
};

const EMPTY: Draft = { name: "", email: "", role: "bd_executive", is_active: true, password: "" };

function UsersPage() {
  const isSuperAdmin = useIsSuperAdmin();
  const role = useRole();
  const { data: users = [], isLoading } = useGetAdminUsersQuery(undefined, { skip: !isSuperAdmin });
  const [createUser, { isLoading: creating }] = useCreateAdminUserMutation();
  const [updateUser] = useUpdateAdminUserMutation();
  const [deactivateUser] = useDeactivateAdminUserMutation();

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const isNew = editing != null && editing.id == null;

  const list = useMemo(
    () =>
      users.filter((u) =>
        q ? [u.name, u.email].some((f) => f.toLowerCase().includes(q.toLowerCase())) : true,
      ),
    [q, users],
  );
  const admins = users.filter((u) => u.role === "super_admin").length;

  if (!isSuperAdmin) {
    return <Forbidden page="Users & roles" role={role} allowedRoles={["super_admin"]} />;
  }

  const openNew = () => setEditing({ ...EMPTY });
  const openEdit = (u: AdminUser) =>
    setEditing({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      password: "",
    });

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    try {
      if (isNew) {
        if (editing.password.length < 8) {
          toast.error("Set a password of at least 8 characters");
          return;
        }
        await createUser({
          name: editing.name,
          email: editing.email,
          role: editing.role,
          is_active: editing.is_active,
          password: editing.password,
        }).unwrap();
        toast.success(`Created ${editing.name}`);
      } else {
        const body: Partial<AdminUser> & { password?: string } = {
          name: editing.name,
          email: editing.email,
          role: editing.role,
          is_active: editing.is_active,
        };
        if (editing.password) body.password = editing.password;
        await updateUser({ id: editing.id!, body }).unwrap();
        toast.success(`Updated ${editing.name}`);
      }
      setEditing(null);
    } catch {
      toast.error("Save failed — check the details and try again");
    }
  };

  const toggleStatus = async (u: AdminUser) => {
    try {
      if (u.is_active) {
        await deactivateUser(u.id).unwrap();
        toast.success(`${u.name} disabled`);
      } else {
        await updateUser({ id: u.id, body: { is_active: true } }).unwrap();
        toast.success(`${u.name} enabled`);
      }
    } catch {
      toast.error("Could not change status");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Users & roles"
        subtitle={`${users.length} users · ${admins} super admins`}
        actions={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add user
          </button>
        }
      />

      <div className="mb-3 flex max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users or emails…"
          className="w-full bg-transparent text-[13px] focus:outline-none"
        />
      </div>

      <div className="glass overflow-hidden rounded-xl">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="grid h-7 w-7 place-items-center rounded-md text-[10.5px] font-semibold text-primary-foreground"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {u.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">{u.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-[11.5px] text-muted-foreground">
                  {u.email}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      roleStyles[u.role],
                    )}
                  >
                    {u.role === "super_admin" ? (
                      <ShieldCheck className="h-3 w-3" />
                    ) : (
                      <Shield className="h-3 w-3" />
                    )}
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      u.is_active
                        ? "border-success/25 bg-success/10 text-success"
                        : "border-destructive/25 bg-destructive/10 text-destructive",
                    )}
                  >
                    {u.is_active ? "active" : "disabled"}
                  </span>
                </td>
                <td className="px-3 py-2 tabular text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleStatus(u)}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                      title={u.is_active ? "Disable user" : "Enable user"}
                      aria-label={u.is_active ? "Disable user" : "Enable user"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openEdit(u)}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            )}
            {!isLoading && list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "Add user" : "Edit user"}
        footer={
          <>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isNew ? "Create user" : "Save changes"}
            </button>
          </>
        }
      >
        {editing && (
          <>
            <Field label="Name">
              <input
                className={inputCls}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={inputCls}
                value={editing.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select
                  className={inputCls}
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value as UserRole })}
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="manager">Manager</option>
                  <option value="bd_executive">BD Executive</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  className={inputCls}
                  value={editing.is_active ? "active" : "disabled"}
                  onChange={(e) =>
                    setEditing({ ...editing, is_active: e.target.value === "active" })
                  }
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </Field>
            </div>
            <Field label={isNew ? "Password" : "Reset password (optional)"}>
              <input
                type="password"
                autoComplete="new-password"
                className={inputCls}
                placeholder={isNew ? "Min. 8 characters" : "Leave blank to keep current"}
                value={editing.password}
                onChange={(e) => setEditing({ ...editing, password: e.target.value })}
              />
            </Field>
          </>
        )}
      </Modal>
    </div>
  );
}
