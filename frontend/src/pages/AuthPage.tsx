import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFinance } from "../context/FinanceContext";

export default function AuthPage() {
  const navigate = useNavigate();
  const { forgotPassword, login, register } = useFinance();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [signinForm, setSigninForm] = useState({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signinForm.email || !signinForm.password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(signinForm);
      navigate("/dashboard", { replace: true });
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Failed to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (
      !signupForm.displayName ||
      !signupForm.email ||
      !signupForm.password ||
      !signupForm.confirmPassword
    ) {
      setErrorMessage("All fields are required.");
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        displayName: signupForm.displayName,
        email: signupForm.email,
        password: signupForm.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail) {
      setErrorMessage("Email is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const message = await forgotPassword(forgotEmail);
      setSuccessMessage(message);
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Failed to send reset link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <p className="eyebrow">Personal Finance Tracker</p>
        <h1>Track spending, budgets, goals, and recurring bills in one calm workspace.</h1>
        <p>
          Sign in to sync your accounts, transactions, budgets, goals, recurring payments, and reports
          directly from the Spring Boot APIs.
        </p>

        <div className="auth-hero-grid">
          <article>
            <strong>One-screen dashboard</strong>
            <span>Balance, income, expense, category spend, recent activity, and upcoming bills.</span>
          </article>
          <article>
            <strong>Fast transaction entry</strong>
            <span>Date, type, category, account, note, tags, and transfer-ready flows.</span>
          </article>
          <article>
            <strong>Budget and goal tracking</strong>
            <span>Clear progress, over-budget states, goal creation, and recurring reminders.</span>
          </article>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-tabs">
          <button
            className={`ghost-button${mode === "signin" ? " tab-active" : ""}`}
            type="button"
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            className={`ghost-button${mode === "signup" ? " tab-active" : ""}`}
            type="button"
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
          <button
            className={`ghost-button${mode === "forgot" ? " tab-active" : ""}`}
            type="button"
            onClick={() => setMode("forgot")}
          >
            Forgot password
          </button>
        </div>

        <div className="section-card-header auth-header">
          <div>
            <h2>
              {mode === "signin"
                ? "Welcome back"
                : mode === "signup"
                  ? "Create your workspace"
                  : "Reset your password"}
            </h2>
            <p>
              {mode === "signin"
                ? "Sign in to continue to your personal finance dashboard."
                : mode === "signup"
                  ? "Set up an account to start tracking budgets, spending, and goals."
                  : "We will email a secure reset link if the address exists."}
            </p>
          </div>
        </div>

        {mode === "signin" ? (
          <form className="auth-form" onSubmit={handleSignIn}>
            <label>
              Email
              <input
                type="email"
                placeholder="name@example.com"
                value={signinForm.email}
                onChange={(event) =>
                  setSigninForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={signinForm.password}
                onChange={(event) =>
                  setSigninForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
        ) : null}

        {mode === "signup" ? (
          <form className="auth-form" onSubmit={handleSignUp}>
            <label>
              Full name
              <input
                type="text"
                placeholder="Amiti User"
                value={signupForm.displayName}
                onChange={(event) =>
                  setSignupForm((current) => ({ ...current, displayName: event.target.value }))
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                placeholder="name@example.com"
                value={signupForm.email}
                onChange={(event) =>
                  setSignupForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={signupForm.password}
                onChange={(event) =>
                  setSignupForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                placeholder="Repeat your password"
                value={signupForm.confirmPassword}
                onChange={(event) =>
                  setSignupForm((current) => ({ ...current, confirmPassword: event.target.value }))
                }
              />
            </label>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Account"}
            </button>
          </form>
        ) : null}

        {mode === "forgot" ? (
          <form className="auth-form" onSubmit={handleForgotPassword}>
            <label>
              Email
              <input
                type="email"
                placeholder="name@example.com"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
              />
            </label>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : null}

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {successMessage ? <p className="form-success">{successMessage}</p> : null}

        <div className="auth-links">
          <Link to="/login" onClick={() => setMode("signin")}>
            Back to sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
