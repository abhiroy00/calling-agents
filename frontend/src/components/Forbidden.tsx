import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { ROLE_LABEL } from "@/features/admin/adminAccess";
import type { UserRole } from "@/features/auth/authSlice";

export default function Forbidden({
  page,
  role,
  allowedRoles,
}: {
  page: string;
  role: UserRole | null;
  allowedRoles: UserRole[];
}) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="glass rounded-2xl p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/15 text-destructive">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Access denied</h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          Your role{role ? ` (${ROLE_LABEL[role]})` : ""} doesn't have permission to view{" "}
          <span className="font-medium text-foreground">{page}</span>.
        </p>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Required role:{" "}
          <span className="font-medium text-foreground">
            {allowedRoles.map((r) => ROLE_LABEL[r]).join(" or ")}
          </span>
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link
            to="/dashboard"
            className="rounded-lg border border-border bg-background px-4 py-2 text-[13px] font-semibold hover:border-primary/40"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
