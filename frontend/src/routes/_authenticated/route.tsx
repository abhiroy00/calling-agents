import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useSelector } from "react-redux";
import { Navigate } from "@tanstack/react-router";
import AppShell from "@/components/AppShell";
import { store, type RootState } from "@/app/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: ({ location }) => {
    const token = store.getState().auth.token;
    if (!token) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const token = useSelector((s: RootState) => s.auth.token);
  if (!token) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
