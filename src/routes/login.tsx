import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, ArrowLeft, Briefcase, Users, Delete } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — MedWare Logistics" },
      { name: "description", content: "Enter your PIN to access MedWare Logistics — the MSNI inventory and shipment platform." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loginWithPin } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, bounce to app
  useEffect(() => {
    if (user) navigate({ to: "/app" });
  }, [user, navigate]);

  const submit = async (value: string) => {
    setSubmitting(true);
    setError(null);
    const res = await loginWithPin(value);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      setPin("");
      return;
    }
    toast.success(`Welcome, ${res.user.display_name}`, {
      description: res.user.role === "employee" ? "Signed in as Employee" : "Signed in as Volunteer",
    });
    navigate({ to: "/app" });
  };

  const press = (digit: string) => {
    if (submitting) return;
    setError(null);
    setPin((p) => {
      const next = (p + digit).slice(0, 6);
      if (next.length >= 4 && next.length === p.length + 1) {
        // auto-submit when reaches 4 digits
        // (also still allows up to 6 by pressing more)
      }
      return next;
    });
  };

  const back = () => setPin((p) => p.slice(0, -1));
  const clear = () => setPin("");

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError("Enter at least 4 digits");
      return;
    }
    submit(pin);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border bg-card">
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold">MedWare</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Logistics</div>
            </div>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to MedWare</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your 4–6 digit PIN to continue.
            </p>
            <div className="mt-4 flex justify-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-soft text-primary border border-primary/15">
                <Briefcase className="h-3 w-3" /> Employee
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                <Users className="h-3 w-3" /> Volunteer
              </span>
            </div>
          </div>

          <form
            onSubmit={onSubmitForm}
            className="bg-card border border-border rounded-2xl p-6 shadow-card"
          >
            {/* PIN dots */}
            <div className="flex justify-center gap-3 mb-5" aria-live="polite">
              {Array.from({ length: 6 }).map((_, i) => {
                const filled = i < pin.length;
                return (
                  <div
                    key={i}
                    className={`h-3 w-3 rounded-full border transition-colors ${
                      filled ? "bg-primary border-primary" : "bg-transparent border-border"
                    }`}
                  />
                );
              })}
            </div>

            {error && (
              <div className="mb-4 text-sm text-destructive text-center" role="alert">
                {error}
              </div>
            )}

            {/* Numeric keypad */}
            <div className="grid grid-cols-3 gap-2.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => press(d)}
                  disabled={submitting}
                  className="h-14 rounded-lg border border-border bg-background hover:bg-muted text-xl font-medium transition-colors disabled:opacity-50"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={clear}
                disabled={submitting || pin.length === 0}
                className="h-14 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium transition-colors disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => press("0")}
                disabled={submitting}
                className="h-14 rounded-lg border border-border bg-background hover:bg-muted text-xl font-medium transition-colors disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={back}
                disabled={submitting || pin.length === 0}
                className="h-14 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-40"
                aria-label="Backspace"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || pin.length < 4}
              className="mt-5 w-full h-12 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting ? "Verifying…" : "Sign in"}
            </button>

            {/* Hidden input for keyboard accessibility */}
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setError(null);
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
              }}
              className="sr-only"
              aria-label="PIN"
            />
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5">
            Demo PINs · Employee <span className="font-mono text-foreground">1234</span> ·
            Volunteer <span className="font-mono text-foreground">1111</span>
          </p>
        </div>
      </main>
    </div>
  );
}
