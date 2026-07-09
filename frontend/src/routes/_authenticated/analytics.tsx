import { createFileRoute } from "@tanstack/react-router";
import DashboardView from "@/components/DashboardView";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — LeadGen+" },
      { name: "description", content: "Deeper analytics on your AI calling performance." },
    ],
  }),
  component: () => (
    <DashboardView
      title="Analytics"
      subtitle="Deep-dive metrics across every campaign and disposition."
    />
  ),
});
