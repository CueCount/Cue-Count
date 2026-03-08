"use client";

// app/landing/page.tsx
import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      // AuthWrapper will automatically detect the new session and show the app
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
    } finally {
      setLoading(false);
    }
  };

  const openModal = (m: "login" | "signup") => {
    setMode(m);
    setError("");
    setEmail("");
    setPassword("");
    setModalOpen(true);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .landing {
          min-height: 100vh;
          background-color: #0a0a0a;
          color: #e8e4dc;
          font-family: 'DM Mono', monospace;
          overflow: hidden;
          position: relative;
        }

        /* Grid background */
        .landing::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        /* Radial glow center */
        .landing::after {
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
        }

        .nav-logo span {
          color: #c4a45f;
        }

        .nav-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .btn-ghost {
          background: none;
          border: 1px solid rgba(255,255,255,0.15);
          color: #e8e4dc;
          padding: 8px 20px;
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-ghost:hover {
          border-color: rgba(196,164,95,0.5);
          color: #c4a45f;
        }

        .btn-primary {
          background: #c4a45f;
          border: none;
          color: #0a0a0a;
          padding: 8px 20px;
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #d4b470;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* HERO */
        .hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 0 48px;
          max-width: 900px;
        }

        .hero-eyebrow {
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #c4a45f;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .hero-eyebrow::before {
          content: '';
          display: block;
          width: 32px;
          height: 1px;
          background: #c4a45f;
        }

        .hero-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(3rem, 7vw, 6rem);
          line-height: 1.0;
          letter-spacing: -0.02em;
          color: #e8e4dc;
          margin-bottom: 32px;
        }

        .hero-title em {
          font-style: italic;
          color: #c4a45f;
        }

        .hero-sub {
          font-size: 0.85rem;
          line-height: 1.8;
          color: rgba(232,228,220,0.45);
          max-width: 480px;
          margin-bottom: 48px;
          letter-spacing: 0.02em;
        }

        .hero-cta {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .hero-cta .btn-primary {
          padding: 14px 32px;
          font-size: 0.8rem;
        }

        .hero-cta .btn-ghost {
          padding: 14px 32px;
          font-size: 0.8rem;
        }

        /* Floating data pill */
        .data-badge {
          position: fixed;
          bottom: 40px;
          right: 48px;
          border: 1px solid rgba(196,164,95,0.2);
          padding: 16px 24px;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          color: rgba(196,164,95,0.6);
          text-transform: uppercase;
        }

        /* MODAL OVERLAY */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(6px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* MODAL */
        .modal {
          background: #111;
          border: 1px solid rgba(255,255,255,0.1);
          width: 100%;
          max-width: 420px;
          padding: 48px;
          position: relative;
          animation: slideUp 0.25s ease;
        }

        .modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          font-size: 1.2rem;
          cursor: pointer;
          line-height: 1;
          transition: color 0.2s;
          font-family: 'DM Mono', monospace;
        }

        .modal-close:hover { color: #e8e4dc; }

        .modal-title {
          font-family: 'DM Serif Display', serif;
          font-size: 1.8rem;
          color: #e8e4dc;
          margin-bottom: 6px;
        }

        .modal-sub {
          font-size: 0.72rem;
          color: rgba(232,228,220,0.35);
          letter-spacing: 0.05em;
          margin-bottom: 36px;
        }

        .modal-toggle {
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

        .modal-submit {
          width: 100%;
          margin-top: 8px;
          padding: 14px;
          font-size: 0.78rem;
        }
      `}</style>

      <div className="landing">
        {/* NAV */}
        <nav>
          <div className="nav-logo">Cue<span>Count</span></div>
          <div className="nav-actions">
            <button className="btn-ghost" onClick={() => openModal("login")}>Log in</button>
            <button className="btn-primary" onClick={() => openModal("signup")}>Get Access</button>
          </div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-eyebrow">Investment Intelligence</div>
          <h1 className="hero-title">
            Read the<br />
            signals others<br />
            <em>miss.</em>
          </h1>
          <p className="hero-sub">
            CueCount surfaces the qualitative patterns buried in founder data,
            transcripts, and market signals — before they become obvious.
          </p>
          <div className="hero-cta">
            <button className="btn-primary" onClick={() => openModal("signup")}>Request Access</button>
            <button className="btn-ghost" onClick={() => openModal("login")}>Sign In</button>
          </div>
        </div>

        {/* Floating badge */}
        <div className="data-badge">Early Access · Invite Only</div>

        {/* MODAL */}
        {modalOpen && (
          <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
            <div className="modal">
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>

              <div className="modal-title">{mode === "login" ? "Welcome back." : "Get started."}</div>
              <div className="modal-sub">
                {mode === "login" ? "Sign in to your CueCount workspace." : "Create your CueCount account."}
              </div>

              {/* Toggle */}
              <div className="modal-toggle">
                <button
                  className={`toggle-btn ${mode === "login" ? "active" : ""}`}
                  onClick={() => { setMode("login"); setError(""); }}
                >
                  Log In
                </button>
                <button
                  className={`toggle-btn ${mode === "signup" ? "active" : ""}`}
                  onClick={() => { setMode("signup"); setError(""); }}
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

                <button type="submit" className="btn-primary modal-submit" disabled={loading}>
                  {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}