import { useState } from "react";
import { NIGERIAN_REGIONS } from "../lib/constants";

interface OnboardingProps {
  onComplete: (displayName: string, region: string) => Promise<void>;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<"name" | "region">("name");
  const [displayName, setDisplayName] = useState("");
  const [region, setRegion] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleName = () => {
    if (displayName.trim().length < 2) { setError("Enter your name (at least 2 characters)"); return; }
    setError("");
    setStep("region");
  };

  const handleFinish = async () => {
    setLoading(true);
    setError("");
    try {
      await onComplete(displayName.trim(), region);
    } catch {
      setError("Couldn't connect — check your internet and try again");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", background: "var(--loop-bg)" }}>
      {/* Logo */}
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(62,222,114,0.12)", border: "2px solid var(--loop-green)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", boxShadow: "0 0 24px rgba(62,222,114,0.2)" }}>
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
        {step === "name" && (
          <>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8 }}>What's your name?</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              This is what others will see when you join a room.
            </p>
            <input
              autoFocus
              type="text"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleName()}
              maxLength={40}
              style={{
                width: "100%", padding: "1rem 1.25rem",
                background: "var(--loop-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)", color: "#fff", fontSize: "1rem",
                outline: "none", marginBottom: "1rem", transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--loop-green)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
            />
            {error && <p style={{ color: "#FF6B6B", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</p>}
            <button className="btn-primary" onClick={handleName}>
              Continue →
            </button>
          </>
        )}

        {step === "region" && (
          <>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8 }}>Where are you from?</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              We'll show you rooms from your region first.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "1.25rem", maxHeight: "50svh", overflowY: "auto" }}>
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
            {error && <p style={{ color: "#FF6B6B", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</p>}
            <button className="btn-primary" onClick={handleFinish} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 8 }} />Joining Loop...</> : "Enter Loop →"}
            </button>
            <button className="btn-ghost" style={{ marginTop: "0.625rem" }} onClick={() => setStep("name")}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
