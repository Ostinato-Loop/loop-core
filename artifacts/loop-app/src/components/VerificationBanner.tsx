// RALD Identity — Verification Banner
// Shown in the Loop room browser when user.needsVerification is true.
// Dismissible for 3 days via localStorage; auto re-surfaces after that.
// Links to profiles.rald.cloud/verify for phone/email verification.
// LILCKY STUDIO LIMITED

import { useState, useEffect } from "react";
import type { LocalUser } from "../hooks/useAuth";

const DISMISS_KEY  = "loop_verify_banner_until";
const DISMISS_DAYS = 3;

interface Props {
  user: LocalUser;
}

export default function VerificationBanner({ user }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user.needsVerification) return;
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored && Date.now() < Number(stored)) return; // still dismissed
    setVisible(true);
  }, [user.needsVerification]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    setVisible(false);
  };

  const verifyUrl = user.verificationUrl || "https://profiles.rald.cloud/verify";
  const mail      = user.reservedEmailAddress || `${user.username}@rald.me`;

  return (
    <div
      role="status"
      aria-label="Identity verification prompt"
      style={{
        margin: "0.75rem 1.25rem 0",
        padding: "0.875rem 1rem",
        borderRadius: "var(--radius-xl)",
        background: "rgba(245,166,35,0.06)",
        border: "1px solid rgba(245,166,35,0.25)",
        position: "relative",
      }}
    >
      {/* Dismiss × */}
      <button
        onClick={dismiss}
        aria-label="Dismiss verification reminder"
        style={{
          position: "absolute", top: 7, right: 7,
          width: 24, height: 24, borderRadius: "50%",
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.28)", fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, padding: 0,
        }}
      >
        ✕
      </button>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", paddingRight: "1.5rem" }}>
        {/* Shield icon */}
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          borderRadius: "50%",
          background: "rgba(245,166,35,0.12)",
          border: "1px solid rgba(245,166,35,0.28)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
        }}>
          🛡️
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#fff", marginBottom: 3 }}>
            Secure your identity, <span style={{ color: "rgba(245,166,35,0.9)" }}>@{user.username}</span>
          </p>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.48)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
            Add a phone or email to lock in{" "}
            <span style={{ color: "rgba(245,166,35,0.85)", fontWeight: 600 }}>{mail}</span>
            {" "}and access every RALD product.
          </p>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "0.35rem 0.875rem",
                borderRadius: 999,
                background: "rgba(245,166,35,0.14)",
                border: "1px solid rgba(245,166,35,0.38)",
                color: "#F5A623",
                fontSize: "0.78rem", fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Verify now →
            </a>
            <button
              onClick={dismiss}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "0.75rem", color: "rgba(255,255,255,0.3)",
                fontWeight: 600, padding: "0.35rem 0.25rem",
              }}
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
