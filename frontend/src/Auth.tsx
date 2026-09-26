import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Wallet, ArrowRight, ShieldCheck } from "lucide-react";
import { save } from "./api";
import { useApp } from "./context";
import { Field } from "./ui";
export default function Auth({ mode }: { mode: string }) {
  const { setUser, toast } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const register = mode === "register",
    reset = mode === "reset-password",
    forgot = mode === "forgot-password";
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const b = Object.fromEntries(f);
    try {
      const u = await save("auth/" + mode, {
        ...b,
        remember: f.get("remember") === "on",
        token: params.get("token"),
      });
      if (mode === "login") {
        setUser(u);
        nav("/");
      } else {
        toast(
          forgot
            ? "If your account exists, a reset link has been sent."
            : register
              ? "Account created. Sign in to continue."
              : "Password reset. Sign in to continue.",
        );
        if (!forgot) nav("/login");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <aside>
        <div className="brand">
          <Wallet /> daybook<span>PERSONAL FINANCE</span>
        </div>
        <div>
          <span className="eyebrow">A LITTLE CLARITY. EVERY DAY.</span>
          <h1>
            Make room for
            <br />
            what matters.
          </h1>
          <p>
            A clear view of your spending, your plans, and your next milestone.
          </p>
          <div className="auth-note">
            <ShieldCheck />
            <span>
              Your finances.
              <br />
              <strong>Your space.</strong>
            </span>
          </div>
        </div>
        <small>Track today. Plan tomorrow.</small>
      </aside>
      <main>
        <div className="auth-form">
          <span className="eyebrow">YOUR DAILY MONEY COMPANION</span>
          <h2>
            {register
              ? "Create your account"
              : reset
                ? "Choose a new password"
                : forgot
                  ? "Forgot your password?"
                  : "Welcome back."}
          </h2>
          <p className="muted">
            {forgot
              ? "We’ll email you a link to reset your password."
              : register
                ? "Start with a clean slate. Every small step counts."
                : reset
                  ? "Use a strong password you haven’t used before."
                  : "Let’s see how your day is adding up."}
          </p>
          <form onSubmit={submit} key={mode}>
            {register && (
              <div className="form-grid">
                <Field label="First name">
                  <input
                    name="firstName"
                    required
                    autoComplete="given-name"
                    maxLength={100}
                  />
                </Field>
                <Field label="Last name">
                  <input
                    name="lastName"
                    required
                    autoComplete="family-name"
                    maxLength={100}
                  />
                </Field>
              </div>
            )}
            {!reset && (
              <Field label="Email address">
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </Field>
            )}
            {!forgot && (
              <Field label="Password">
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={72}
                  required
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              </Field>
            )}
            {(register || reset) && (
              <>
                <small className="muted">
                  8–72 characters, including uppercase, lowercase, a number, and
                  a special character.
                </small>
                <Field label="Confirm password">
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                  />
                </Field>
              </>
            )}
            {mode === "login" && (
              <div className="spread">
                <label className="check">
                  <input name="remember" type="checkbox" /> Remember me
                </label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary wide" disabled={busy}>
              {busy
                ? "Please wait…"
                : register
                  ? "Create account"
                  : reset
                    ? "Reset password"
                    : forgot
                      ? "Send reset link"
                      : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {mode === "login" ? (
              <>
                New to Daybook? <Link to="/register">Create an account</Link>
              </>
            ) : (
              <Link to="/login">Back to sign in</Link>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
