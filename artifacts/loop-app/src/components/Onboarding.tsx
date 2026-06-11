// Loop Onboarding — RALD Identity v2
// Replaces display-name entry with @username claim (RALD identity from day one).
// Flow: username → region → done (JWT issued immediately, no OTP gate)
// LILCKY STUDIO LIMITED

import { useState, useEffect, useRef } from "react";
import { NIGERIAN_REGIONS } from "../lib/constants";
import { checkUsername, type UsernameCheckResult } from "../lib/api";

interface OnboardingProps {
  onComplete: (username: string, displayName: string, region: string) => Promise<void>;
}

type Step = "username" | "region";

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

type CheckStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep]           = useState<Step>("username");
  const [username, setUsername]   = useState("");
  const [displayName, setDisplay] = useState("");
  const [region, setRegion]       = useState("all");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [checkStatus, setCheck]   = useState<CheckStatus>("idle");
  const [checkData, setCheckData] = useState<UsernameCheckResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedUsername = useDebounce(username, 420);

  useEffect(() => { inputRef.current?.focus(); }, [step]);

  // Live availability check
  useEffect(() => {
    const u = debouncedUsername.trim().toLowerCase();
    if (!u || u.length < 2) { setCheck("idle"); setCheckData(null); return; }
    if (u.length > 20 || !/^[a-z0-9_]+$/.test(u) || u.startsWith("_") || u.endsWith("_")) {
      setCheck("invalid"); setCheckData(null); return;
    }
    setCheck("checking");
    let cancelled = false;
    checkUsername(u).then(res => {
      if (cancelled) return;
      setCheckData(res);
      setCheck(res.available ? "available" : "taken");
    }).catch(() => {
      if (!cancelled) { setCheck("idle"); setCheckData(null); }
    });
    return () => { cancelled = true; };
  }, [debouncedUsername]);

  const handleUsernameNext = () => {
    const u = username.trim().toLowerCase();
    if (checkStatus !== "available") {
      if (checkStatus === "taken")   setError(`@${u} is already taken — try another`);
      else if (checkStatus === "checking") setError("Checking availability…");
      else setError("Enter a valid username (2–20 letters, numbers, underscores)");
      return;
    }
    const name = u; // use username as display name by default
    setDisplay(name);
    setError("");
    setStep("region");
  };

  const handleFinish = async () => {
    setLoading(true);
    setError("");
    try {
      await onComplete(username.trim().toLowerCase(), displayName || username.trim().toLowerCase(), region);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Couldn't connect — check your connection and try again";
      setError(msg);
      setLoading(false);
    }
  };

  const isAvailable = checkStatus === "available";
  const isTaken     = checkStatus === "taken";
  const isInvalid   = checkStatus === "invalid";
  const isErr       = isTaken || isInvalid || !!error;

  return (
    <div style={{
      minHeight: "100svh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "1.5rem", background: "var(--loop-bg)",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "rgba(62,222,114,0.12)", border: "2px solid var(--loop-green)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1rem", boxShadow: "0 0 24px rgba(62,222,114,0.2)",
        }}>
          <span style={{ fontSize: 28 }}>🎙️</span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>
          Loop<span style={{ color: "var(--loop-green)" }}>.</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem", marginTop: 4 }}>
          Africa's live audio stage
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* ── Step 1: Username ── */}
        {step === "username" && (
          <>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 6 }}>
              Claim your username
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Your @username is your identity on Loop and every RALD product.
            </p>

            {/* Username input */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "0 1.25rem",
              background: "var(--loop-card)",
              border: `1px solid ${isAvailable ? "var(--loop-green)" : isErr ? "#FF6B6B" : "var(--border)"}`,
              borderRadius: "var(--radius-xl)",
              marginBottom: "0.625rem",
              transition: "border-color 0.15s",
            }}>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.1rem", lineHeight: 1, paddingTop: 1 }}>@</span>
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                placeholder="yourname"
                value={username}
                onChange={e => {
                  const clean = e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 20);
                  setUsername(clean);
                  setError("");
                  if (clean.length < 2) { setCheck("idle"); setCheckData(null); }
                }}
                onKeyDown={e => { if (e.key === "Enter") handleUsernameNext(); }}
                maxLength={20}
                style={{
                  flex: 1, padding: "1rem 0",
                  background: "transparent", border: "none",
                  color: "#fff", fontSize: "1rem", outline: "none",
                }}
              />
              {/* Status indicator */}
              {checkStatus === "checking" && (
                <span className="spinner" style={{ width: 16, height: 16, flexShrink: 0 }} />
              )}
              {isAvailable && (
                <span style={{ color: "var(--loop-green)", fontSize: 18, flexShrink: 0 }}>✓</span>
              )}
              {(isTaken || isInvalid) && (
                <span style={{ color: "#FF6B6B", fontSize: 18, flexShrink: 0 }}>✗</span>
              )}
            </div>

            {/* Feedback */}
            {(error || isTaken || isInvalid) && (
              <p style={{ color: "#FF6B6B", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                {error || (isTaken ? `@${username} is already taken` : "2–20 letters, numbers, or underscores only")}
              </p>
            )}
            {!isErr && checkStatus === "idle" && (
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                2–20 characters · letters, numbers, underscores
              </p>
            )}

            {/* Reservation preview */}
            {isAvailable && checkData?.reservations && (
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(62,222,114,0.06)", border: "1px solid rgba(62,222,114,0.2)",
                marginBottom: "1.25rem",
              }}>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.75rem", marginBottom: 6, fontWeight: 600 }}>
                  Reserved for you:
                </p>
                {[
                  checkData.reservations.mail,
                  `${username}.rald.me`,
                ].map(r => (
                  <div key={r} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ color: "var(--loop-green)", fontSize: 11 }}>✓</span>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem" }}>{r}</span>
                  </div>
                ))}
              </div>
            )}

            {!isAvailable && checkStatus !== "checking" && (
              <div style={{ height: "1rem", marginBottom: "1.25rem" }} />
            )}

            <button
              className="btn-primary"
              onClick={handleUsernameNext}
              disabled={checkStatus === "checking" || (!isAvailable && username.length >= 2)}
              style={{ opacity: checkStatus === "checking" ? 0.6 : 1 }}
            >
              Continue →
            </button>
          </>
        )}

        {/* ── Step 2: Region ── */}
        {step === "region" && (
          <>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 6 }}>
              Where are you from?
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              We'll show you rooms from your region first.
            </p>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem",
              marginBottom: "1.25rem", maxHeight: "50svh", overflowY: "auto",
            }}>
              {NIGERIAN_REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRegion(r.id)}
                  style={{
                    padding: "0.75rem", borderRadius: "var(--radius-lg)",
                    border: `1px solid ${region === r.id ? "var(--loop-green)" : "var(--border)"}`,
                    background: region === r.id ? "rgba(62,222,114,0.1)" : "var(--loop-card)",
                    color: region === r.id ? "var(--loop-green)" : "rgba(255,255,255,0.7)",
                    fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ marginRight: 6 }}>{r.short}</span>
                  {r.label}
                </button>
              ))}
            </div>
            {error && (
              <p style={{ color: "#FF6B6B", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</p>
            )}
            <button className="btn-primary" onClick={handleFinish} disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 8 }} />Joining Loop...</>
                : "Enter Loop →"}
            </button>
            <button className="btn-ghost" style={{ marginTop: "0.625rem" }} onClick={() => { setStep("username"); setError(""); }}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
