import { useState } from "react";

import { useAuth } from "../context/AuthContext";

export function AuthPage() {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function toggleMode() {
    setIsRegistering((current) => !current);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await register({
          email: form.email,
          full_name: form.fullName,
          password: form.password,
        });
      } else {
        await login({ email: form.email, password: form.password });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true">MS</div>
          <div>
            <p className="brand-name">MPLADS Sentinel</p>
            <p className="brand-subtitle">Government Analytics</p>
          </div>
        </div>
        <p className="section-kicker">SECURE WORKSPACE ACCESS</p>
        <h1 id="auth-title">{isRegistering ? "Create an account" : "Welcome back"}</h1>
        <p className="auth-description">
          {isRegistering
            ? "Register to access programme monitoring and decision-support tools."
            : "Sign in to continue to the MPLADS Sentinel workspace."}
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegistering && (
            <label className="form-field">
              <span>Full name</span>
              <input
                autoComplete="name"
                name="fullName"
                onChange={updateField}
                required
                value={form.fullName}
              />
            </label>
          )}
          <label className="form-field">
            <span>Email address</span>
            <input
              autoComplete="email"
              name="email"
              onChange={updateField}
              required
              type="email"
              value={form.email}
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              autoComplete={isRegistering ? "new-password" : "current-password"}
              minLength={isRegistering ? 8 : undefined}
              name="password"
              onChange={updateField}
              required
              type="password"
              value={form.password}
            />
          </label>
          {isRegistering && (
            <p className="auth-hint">
              Passwords must be at least 8 characters. New accounts start as
              Viewer; the first registered account bootstraps the Admin role.
            </p>
          )}
          <button className="primary-button auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Please wait…"
              : isRegistering
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {isRegistering ? "Already have an account?" : "Need an account?"}
          </span>
          <button className="text-button" onClick={toggleMode} type="button">
            {isRegistering ? "Sign in" : "Register"}
          </button>
        </div>
      </section>
    </main>
  );
}