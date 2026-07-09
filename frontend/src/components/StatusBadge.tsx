import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  new: "bg-muted text-muted-foreground border-border",
  queued: "bg-info/15 text-info border-info/30",
  called: "bg-primary/15 text-primary-foreground border-primary/30",
  interested: "bg-success/15 text-success border-success/30",
  not_interested: "bg-destructive/15 text-destructive border-destructive/30",
  callback: "bg-warning/15 text-warning border-warning/30",
  do_not_call: "bg-destructive/15 text-destructive border-destructive/30",
  draft: "bg-muted text-muted-foreground border-border",
  running: "bg-success/15 text-success border-success/30",
  paused: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-info/15 text-info border-info/30",
  stopped: "bg-destructive/15 text-destructive border-destructive/30",
  initiated: "bg-muted text-muted-foreground border-border",
  ringing: "bg-info/15 text-info border-info/30",
  in_progress: "bg-success/15 text-success border-success/30",
  no_answer: "bg-muted text-muted-foreground border-border",
  busy: "bg-warning/15 text-warning border-warning/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  voicemail: "bg-accent text-accent-foreground border-border",
  pending: "bg-muted text-muted-foreground border-border",
};

export default function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const cls = styles[status] || "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        cls,
      )}
    >
      {status === "in_progress" || status === "running" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
      ) : null}
      {status.replace(/_/g, " ")}
    </span>
  );
}
