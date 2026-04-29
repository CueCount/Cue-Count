"use client";

// app/landing/page.tsx
import Link from "next/link";

export default function LandingPage() {
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
          text-decoration: none;
          display: inline-block;
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
          text-decoration: none;
          display: inline-block;
        }

        .btn-primary:hover {
          background: #d4b470;
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
      `}</style>

      <div className="landing">
        {/* NAV */}
        <nav>
          <div className="nav-logo">Cue<span>Count</span></div>
          <div className="nav-actions">
            <Link href="/login" className="btn-ghost">Log in</Link>
            <Link href="/login?mode=signup" className="btn-primary">Get Access</Link>
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
            <Link href="/login?mode=signup" className="btn-primary">Request Access</Link>
            <Link href="/login" className="btn-ghost">Sign In</Link>
          </div>
        </div>

        {/* Floating badge */}
        <div className="data-badge">Early Access · Invite Only</div>
      </div>
    </>
  );
}