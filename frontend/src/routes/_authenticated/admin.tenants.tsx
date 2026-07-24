import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Building2, Users, Zap, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Modal, Field, inputCls } from "@/components/Modal";
import Forbidden from "@/components/Forbidden";
import { cn } from "@/lib/utils";
import { useIsSuperAdmin, useRole } from "@/features/admin/adminAccess";
import {
  useGetTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useDeleteTenantMutation,
  type Tenant,
} from "@/features/admin/adminApi";

export const Route = createFileRoute("/_authenticated/admin/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants — LeadGen+ Admin" },
      { name: "description", content: "Provision, edit, and manage every workspace." },
    ],
  }),
  component: TenantsPage,
});

const planStyles: Record<Tenant["plan"], string> = {
  starter: "border-border bg-muted text-foreground",
  growth: "border-primary/30 bg-primary/10 text-primary",
  scale: "border-info/30 bg-info/10 text-info",
};
const statusStyles: Record<Tenant["status"], string> = {
  active: "border-success/25 bg-success/10 text-success",
  trial: "border-warning/25 bg-warning/10 text-warning-foreground",
  suspended: "border-destructive/25 bg-destructive/10 text-destructive",
};

type Draft = Omit<Tenant, "id" | "created_at"> & { id?: number };
const EMPTY: Draft = {
  name: "",
  plan: "starter",
  seats: 5,
  minutes_quota: 500,
  minutes_used: 0,
  status: "trial",
};

function TenantsPage() {
  const isSuperAdmin = useIsSuperAdmin();
  const role = useRole();
  const { data: tenants = [], isLoading } = useGetTenantsQuery(undefined, { skip: !isSuperAdmin });
  const [createTenant, { isLoading: creating }] = useCreateTenantMutation();
  const [updateTenant] = useUpdateTenantMutation();
  const [deleteTenant] = useDeleteTenantMutation();

  const [editing, setEditing] = useState<Draft | null>(null);
  const isNew = editing != null && editing.id == null;

  if (!isSuperAdmin) {
    return <Forbidden page="Tenants" role={role} allowedRoles={["super_admin"]} />;
  }

  const openNew = () => setEditing({ ...EMPTY });
  const openEdit = (t: Tenant) => setEditing({ ...t });

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Tenant name is required");
      return;
    }
    const { id, ...body } = editing;
    try {
      if (isNew) {
        await createTenant(body).unwrap();
        toast.success(`Provisioned ${editing.name}`);
      } else {
        await updateTenant({ id: id!, body }).unwrap();
        toast.success(`Updated ${editing.name}`);
      }
      setEditing(null);
    } catch {
      toast.error("Save failed");
    }
  };

  const remove = async (t: Tenant) => {
    if (!confirm(`Delete tenant ${t.name}?`)) return;
    try {
      await deleteTenant(t.id).unwrap();
      toast.success(`Deleted ${t.name}`);
    } catch {
      toast.error("Delete failed");
    }
  };

  const cycleStatus = async (t: Tenant) => {
    const next: Tenant["status"] =
      t.status === "active" ? "suspended" : t.status === "suspended" ? "trial" : "active";
    try {
      await updateTenant({ id: t.id, body: { status: next } }).unwrap();
      toast.success(`${t.name} → ${next}`);
    } catch {
      toast.error("Could not update status");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Tenants"
        subtitle={`${tenants.length} workspaces · ${tenants.reduce((a, t) => a + t.seats, 0)} total seats`}
        actions={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Provision tenant
          </button>
        }
      />

      {isLoading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="glass grid place-items-center rounded-xl p-12 text-center text-muted-foreground">
          <Building2 className="mb-2 h-6 w-6" />
          <p className="text-[13px]">No tenants yet. Provision your first workspace.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((t) => {
            const pct = Math.round((t.minutes_used / Math.max(t.minutes_quota, 1)) * 100);
            return (
              <div key={t.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{t.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">#{t.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => cycleStatus(t)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider hover:opacity-80",
                      statusStyles[t.status],
                    )}
                    title="Cycle status"
                  >
                    {t.status}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      planStyles[t.plan],
                    )}
                  >
                    <Zap className="h-3 w-3" /> {t.plan}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Users className="h-3 w-3" /> {t.seats} seats
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Minutes used</span>
                    <span className="tabular text-foreground">
                      {t.minutes_used.toLocaleString()} / {t.minutes_quota.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary",
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Created {new Date(t.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(t)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-primary hover:bg-primary/10"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => remove(t)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "Provision tenant" : "Edit tenant"}
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
              {isNew ? "Provision" : "Save changes"}
            </button>
          </>
        }
      >
        {editing && (
          <>
            <Field label="Workspace name">
              <input
                className={inputCls}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plan">
                <select
                  className={inputCls}
                  value={editing.plan}
                  onChange={(e) =>
                    setEditing({ ...editing, plan: e.target.value as Tenant["plan"] })
                  }
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="scale">Scale</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  className={inputCls}
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value as Tenant["status"] })
                  }
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                </select>
              </Field>
              <Field label="Seats">
                <input
                  type="number"
                  className={inputCls}
                  value={editing.seats}
                  onChange={(e) => setEditing({ ...editing, seats: Number(e.target.value) })}
                />
              </Field>
              <Field label="Minutes quota">
                <input
                  type="number"
                  className={inputCls}
                  value={editing.minutes_quota}
                  onChange={(e) =>
                    setEditing({ ...editing, minutes_quota: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Minutes used">
                <input
                  type="number"
                  className={inputCls}
                  value={editing.minutes_used}
                  onChange={(e) => setEditing({ ...editing, minutes_used: Number(e.target.value) })}
                />
              </Field>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
