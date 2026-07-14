import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "@tanstack/react-router";
import { Upload, Megaphone, PhoneCall, Sparkles, X, ArrowRight, Check } from "lucide-react";
import type { RootState } from "@/app/store";
import { setOnboardingStep, completeOnboarding } from "@/features/billing/billingSlice";

const STEPS = [
  {
    icon: Upload,
    title: "Upload your first lead list",
    body: "Drop a CSV or XLSX with names & phone numbers. We'll normalize the format for you.",
    to: "/leads" as const,
    cta: "Import leads",
  },
  {
    icon: Megaphone,
    title: "Create a campaign",
    body: "Pick a script, voice, and calling hours. Your AI agent is ready in minutes.",
    to: "/campaigns" as const,
    cta: "New campaign",
  },
  {
    icon: PhoneCall,
    title: "Watch it dial live",
    body: "Open the live board to see conversations happen in real time — barge in anytime.",
    to: "/live" as const,
    cta: "Open live board",
  },
];

export default function OnboardingModal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { onboardingComplete, onboardingStep } = useSelector((s: RootState) => s.billing);

  if (onboardingComplete) return null;

  function skip() {
    dispatch(completeOnboarding());
  }

  function next() {
    if (onboardingStep >= STEPS.length - 1) {
      dispatch(completeOnboarding());
    } else {
      dispatch(setOnboardingStep(onboardingStep + 1));
    }
  }

  function goTo(step: (typeof STEPS)[number]) {
    dispatch(completeOnboarding());
    navigate({ to: step.to });
  }

  const current = STEPS[Math.min(onboardingStep, STEPS.length - 1)];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <button
          onClick={skip}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Skip onboarding"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-border bg-primary/5 px-6 py-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            <Sparkles className="h-3 w-3" /> 100 free minutes unlocked
          </span>
          <h2 className="mt-2 font-display text-xl font-bold tracking-tight">Welcome to LeadGen+</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Three quick steps to launch your first AI calling campaign.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-6 pt-5">
          {STEPS.map((_, i) => {
            const done = i < onboardingStep;
            const active = i === onboardingStep;
            return (
              <div key={i} className="flex flex-1 items-center gap-2">
                <div
                  className={
                    "grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold " +
                    (done
                      ? "bg-primary text-primary-foreground"
                      : active
                        ? "border-2 border-primary bg-background text-primary"
                        : "border border-border bg-muted text-muted-foreground")
                  }
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={"h-px flex-1 " + (done ? "bg-primary" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-6">
          <div className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold">{current.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{current.body}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-6 py-4">
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">
            Skip for now
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={next}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              {onboardingStep >= STEPS.length - 1 ? "Finish" : "Next"}
            </button>
            <button
              onClick={() => goTo(current)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {current.cta} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
