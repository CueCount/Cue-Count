"use client";

// app/login/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-page login + signup. Replaces the modal that was on the landing page.
//
// URL params:
//   • ?mode=signup       → start in signup mode (default is "login")
//   • ?returnTo=/...     → after successful auth, push the user to this path
//                          instead of "/". Used by /accept-invite to bring
//                          the user back to the invite flow after auth.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

function LoginPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initialMode  = searchParams.get("mode") === "signup" ? "signup" : "login";
  const returnTo     = searchParams.get("returnTo") ?? "/";

  const { user, loading: authLoading } = useAuth();

  const [mode,     setMode]     = useState<"login" | "signup">(initialMode);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // ─── If already signed in, bounce them through ────────────────────────
  // This handles the case where someone hits /login while already authed —
  // e.g. they bookmarked it, or they finished signup in another tab. Avoids
  // a "you're already signed in" dead-end.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(returnTo);
    }
  }, [user, authLoading, returnTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // The auth state observer fires, useAuth's user updates, and the
      // useEffect above pushes us to returnTo. We could also push here
      // directly, but doing it through the effect keeps the redirect
      // logic in one place.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-page {
          min-height: 100vh;
          background-color: #0a0a0a;
          color: #e8e4dc;
          font-family: 'DM Mono', monospace;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        /* Grid background */
        .login-page::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        /* Radial glow */
        .login-page::after {
          content: '';
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 700px;
          height: 700px;
          background: radial-gradient(ellipse, rgba(196,164,95,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        /* NAV */
        nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 48px;
          z-index: 10;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(8px);
        }

        .nav-logo {
          font-family: 'DM Serif Display', serif;
          font-size: 1.4rem;
          letter-spacing: 0.02em;
          color: #e8e4dc;
          text-decoration: none;
        }

        .nav-logo span {
          color: #c4a45f;
        }

        .nav-back {
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(232,228,220,0.5);
          text-decoration: none;
          transition: color 0.2s;
        }

        .nav-back:hover { color: #c4a45f; }

        /* Main */
        .login-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 120px 24px 48px;
          position: relative;
          z-index: 1;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: #111;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 48px;
        }

        .login-title {
          font-family: 'DM Serif Display', serif;
          font-size: 1.8rem;
          color: #e8e4dc;
          margin-bottom: 6px;
        }

        .login-sub {
          font-size: 0.72rem;
          color: rgba(232,228,220,0.35);
          letter-spacing: 0.05em;
          margin-bottom: 36px;
        }

        .login-toggle {
          display: flex;
          gap: 0;
          margin-bottom: 32px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .toggle-btn {
          flex: 1;
          background: none;
          border: none;
          color: rgba(232,228,220,0.35);
          padding: 10px;
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-btn.active {
          background: rgba(196,164,95,0.1);
          color: #c4a45f;
        }

        .field {
          margin-bottom: 16px;
        }

        .field label {
          display: block;
          font-size: 0.65rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(232,228,220,0.4);
          margin-bottom: 8px;
        }

        .field input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #e8e4dc;
          padding: 12px 16px;
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .field input:focus {
          border-color: rgba(196,164,95,0.5);
        }

        .field input::placeholder {
          color: rgba(232,228,220,0.2);
        }

        .error-msg {
          font-size: 0.72rem;
          color: #e07070;
          margin-bottom: 16px;
          letter-spacing: 0.03em;
        }

        .submit-btn {
          width: 100%;
          margin-top: 8px;
          padding: 14px;
          font-size: 0.78rem;
          background: #c4a45f;
          border: none;
          color: #0a0a0a;
          font-family: 'DM Mono', monospace;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
        }

        .submit-btn:hover { background: #d4b470; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="login-page">
        <nav>
          <Link href="/landing" className="nav-logo">Cue<span>Count</span></Link>
          <Link href="/landing" className="nav-back">← Back</Link>
        </nav>

        <main className="login-main">
          <div className="login-card">
            <div className="login-title">
              {mode === "login" ? "Welcome back." : "Get started."}
            </div>
            <div className="login-sub">
              {mode === "login"
                ? "Sign in to your CueCount workspace."
                : "Create your CueCount account."}
            </div>

            <div className="login-toggle">
              <button
                className={`toggle-btn ${mode === "login" ? "active" : ""}`}
                onClick={() => { setMode("login"); setError(""); }}
                type="button"
              >
                Log In
              </button>
              <button
                className={`toggle-btn ${mode === "signup" ? "active" : ""}`}
                onClick={() => { setMode("signup"); setError(""); }}
                type="button"
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}

// ─── Suspense wrapper ──────────────────────────────────────────────────────
// useSearchParams() requires a Suspense boundary in Next.js App Router.

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0a" }} />}>
      <LoginPageInner />
    </Suspense>
  );
}