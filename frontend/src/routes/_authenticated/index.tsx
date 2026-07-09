import { createFileRoute } from "@tanstack/react-router";
import DashboardView from "@/components/DashboardView";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — LeadGen+" },
      { name: "description", content: "Overview of your AI calling operations." },
    ],
  }),
  component: () => <DashboardView />,
});
