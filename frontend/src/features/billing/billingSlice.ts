import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type PlanTier = "trial" | "starter" | "growth" | "scale";

export interface BillingState {
  plan: PlanTier;
  minutesQuota: number;
  minutesUsed: number;
  leadsQuota: number;
  leadsUsed: number;
  renewsAt: string; // ISO
  onboardingComplete: boolean;
  onboardingStep: number; // 0..3
}

const TRIAL_MINUTES = 100;
const TRIAL_LEADS = 500;

function nextMonthISO() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function load(): BillingState | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return JSON.parse(localStorage.getItem("billing") || "null");
  } catch {
    return null;
  }
}

function persist(state: BillingState) {
  try {
    localStorage.setItem("billing", JSON.stringify(state));
  } catch {}
}

const initialState: BillingState = load() || {
  plan: "trial",
  minutesQuota: TRIAL_MINUTES,
  minutesUsed: 0,
  leadsQuota: TRIAL_LEADS,
  leadsUsed: 0,
  renewsAt: nextMonthISO(),
  onboardingComplete: false,
  onboardingStep: 0,
};

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    setPlan(state, { payload }: PayloadAction<{ plan: PlanTier; minutesQuota: number; leadsQuota: number }>) {
      state.plan = payload.plan;
      state.minutesQuota = payload.minutesQuota;
      state.leadsQuota = payload.leadsQuota;
      state.renewsAt = nextMonthISO();
      persist(state);
    },
    trackMinutes(state, { payload }: PayloadAction<number>) {
      state.minutesUsed = Math.max(0, state.minutesUsed + payload);
      persist(state);
    },
    trackLeads(state, { payload }: PayloadAction<number>) {
      state.leadsUsed = Math.max(0, state.leadsUsed + payload);
      persist(state);
    },
    setOnboardingStep(state, { payload }: PayloadAction<number>) {
      state.onboardingStep = payload;
      persist(state);
    },
    completeOnboarding(state) {
      state.onboardingComplete = true;
      persist(state);
    },
    resetBilling() {
      const fresh: BillingState = {
        plan: "trial",
        minutesQuota: TRIAL_MINUTES,
        minutesUsed: 0,
        leadsQuota: TRIAL_LEADS,
        leadsUsed: 0,
        renewsAt: nextMonthISO(),
        onboardingComplete: false,
        onboardingStep: 0,
      };
      persist(fresh);
      return fresh;
    },
  },
});

export const {
  setPlan,
  trackMinutes,
  trackLeads,
  setOnboardingStep,
  completeOnboarding,
  resetBilling,
} = billingSlice.actions;
export default billingSlice.reducer;

// Selectors
export const selectMinutesRemaining = (s: { billing: BillingState }) =>
  Math.max(0, s.billing.minutesQuota - s.billing.minutesUsed);
export const selectLeadsRemaining = (s: { billing: BillingState }) =>
  Math.max(0, s.billing.leadsQuota - s.billing.leadsUsed);
export const selectMinutesPct = (s: { billing: BillingState }) =>
  Math.min(100, (s.billing.minutesUsed / Math.max(1, s.billing.minutesQuota)) * 100);
export const selectQuotaExceeded = (s: { billing: BillingState }) =>
  s.billing.minutesUsed >= s.billing.minutesQuota;
