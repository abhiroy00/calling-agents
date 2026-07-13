import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, Lock, Mail, Zap } from "lucide-react";
import { useLoginMutation } from "@/features/auth/authApi";
import { setCredentials } from "@/features/auth/authSlice";
import type { RootState } from "@/app/store";

interface LoginSearch {
  redirect?: string;
}

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — LeadGen+" },
      { name: "description", content: "Sign in to the LeadGen+ AI calling ops console." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [login, { isLoading, error, reset }] = useLoginMutation();
  const [localError, setLocalError] = useState<string | null>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const token = useSelector((s: RootState) => s.auth.token);

  // Single source of truth for post-login redirect (prevents double-navigate race).
  useEffect(() => {
    if (token) navigate({ to: search.redirect ?? "/dashboard", replace: true });
  }, [token, search.redirect, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!form.email.trim() || !form.password) {
      setLocalError("Enter your email and password to continue.");
      return;
    }
    try {
      const data = await login({ email: form.email.trim(), password: form.password }).unwrap();
      if (!data?.access) {
        setLocalError("Login response was missing a session token. Try again.");
        return;
      }
      dispatch(setCredentials(data));
      // Effect above handles navigation once the token lands in the store.
    } catch (err: any) {
      // Network / CORS errors surface as FETCH_ERROR with no `data`.
      if (err?.status === "FETCH_ERROR") {
        setLocalError("Can't reach the server. Check your connection and try again.");
      }
      // Anything else falls back to the RTK Query `error` shape below.
    }
  }

  const errMsg =
    localError ||
    (error as any)?.data?.non_field_errors?.[0] ||
    (error as any)?.data?.detail ||
    (error as any)?.data?.message ||
    (error ? "Login failed — check your credentials" : null);

  function updateField(field: "email" | "password", value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (localError) setLocalError(null);
    if (error) reset();
  }


  return (
    <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-surface lg:block">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-primary-glow/25 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary glow-ring">
              <Zap className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              LeadGen<span className="text-primary">+</span>
            </span>
          </div>
          <div className="max-w-md">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Midnight Ops</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-foreground">
              Run outbound at
              <br />
              <span className="gradient-text">machine speed.</span>
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Launch AI-driven campaigns, watch the live board, and close callbacks — all from one
              dark, focused command center.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {[
                ["Uptime", "99.98%"],
                ["Avg latency", "142ms"],
                ["Calls / min", "5–60"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</p>
                  <p className="tabular font-display text-sm font-semibold text-foreground">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} LeadGen+. Secured with rotating JWT.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/20 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-display text-base font-bold text-foreground">
                LeadGen<span className="text-primary">+</span>
              </span>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your ops console.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface/60 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface/60 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {errMsg && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Trouble signing in? Contact your workspace admin.
          </p>
        </div>
      </div>
    </div>
  );
}
