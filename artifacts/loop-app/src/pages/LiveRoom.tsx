import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useLiveRoom, type RoomRole } from "../hooks/useLiveRoom";
import { type LocalUser } from "../hooks/useAuth";
import MicPermission from "../components/MicPermission";

interface LiveRoomProps {
  roomId: string;
  user: LocalUser;
  role?: RoomRole;
}

function ParticipantBubble({ name, isSpeaking, isMuted, isLocal, role }: { name: string; isSpeaking: boolean; isMuted: boolean; isLocal: boolean; role: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  const isSpeaker = role === "speaker" || role === "host";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 64 }}>
      <div
        className={isSpeaking && !isMuted ? "speaking-ring" : ""}
        style={{
          width: 56, height: 56, borderRadius: "50%",
          background: isLocal ? "rgba(62,222,114,0.2)" : "rgba(255,255,255,0.06)",
          border: isSpeaker ? `2px solid ${isLocal ? "var(--loop-green)" : "rgba(62,222,114,0.5)"}` : "2px solid rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 18,
          color: isLocal ? "var(--loop-green)" : "#fff",
          position: "relative",
          transition: "border-color 0.2s",
        }}
      >
        {initials || "?"}
        {isMuted && isSpeaker && (
          <span style={{ position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: "#FF4444", border: "2px solid var(--loop-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>🔇</span>
        )}
        {!isMuted && isSpeaker && !isSpeaking && (
          <span style={{ position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: "rgba(62,222,114,0.8)", border: "2px solid var(--loop-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>🎙️</span>
        )}
      </div>
      <span style={{ fontSize: "0.65rem", color: isLocal ? "var(--loop-green)" : "rgba(255,255,255,0.65)", fontWeight: 600, textAlign: "center", maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {isLocal ? "You" : name}
      </span>
    </div>
  );
}

export default function LiveRoom({ roomId, user, role = "listener" }: LiveRoomProps) {
  const [, navigate] = useLocation();
  const [showMicHelp, setShowMicHelp] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());
  const { state, connect, disconnect, toggleMute, requestToSpeak } = useLiveRoom(roomId, user.displayName, role);

  useEffect(() => {
    connect();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => { clearInterval(timer); disconnect(); };
  }, []);

  const handleLeave = async () => {
    await disconnect();
    navigate("/");
  };

  const handleRequestSpeak = async () => {
    try {
      await requestToSpeak();
    } catch {
      setShowMicHelp(true);
    }
  };

  const handleMuteTap = async () => {
    try {
      await toggleMute();
    } catch {
      setShowMicHelp(true);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const speakers = state.participants.filter((p) => p.role === "speaker" || p.role === "host");
  const listeners = state.participants.filter((p) => p.role === "listener");

  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", background: "var(--loop-bg)", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      {showMicHelp && <MicPermission onDismiss={() => setShowMicHelp(false)} />}

      {/* Header */}
      <div style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="pulse-live" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--loop-green)", display: "inline-block" }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--loop-green)", letterSpacing: "0.06em" }}>LIVE · {formatTime(elapsed)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
            🎙️ {state.speakerCount} · 👂 {state.listenerCount}
          </span>
        </div>
      </div>

      {/* Connection state */}
      {state.connecting && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", gap: 12, color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>
          <span className="spinner" />
          Connecting to room...
        </div>
      )}

      {state.error && (
        <div style={{ margin: "1rem 1.25rem", background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: "var(--radius-xl)", padding: "1rem" }}>
          <p style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: 4 }}>Connection issue</p>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{state.error}</p>
          <button onClick={() => connect()} style={{ fontSize: "0.8rem", color: "var(--loop-green)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            Try again →
          </button>
        </div>
      )}

      {/* Speaker grid */}
      <div style={{ flex: 1, padding: "1.5rem 1.25rem", overflowY: "auto" }}>
        {speakers.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
              Speakers · {speakers.length}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem 1rem" }}>
              {speakers.map((p) => (
                <ParticipantBubble
                  key={p.identity}
                  name={p.displayName}
                  isSpeaking={p.isSpeaking}
                  isMuted={p.isMuted}
                  isLocal={p.isLocal}
                  role={p.role}
                />
              ))}
            </div>
          </div>
        )}

        {listeners.length > 0 && (
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
              Listeners · {listeners.length}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {listeners.slice(0, 30).map((p) => (
                <div key={p.identity} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                  {(p.displayName?.[0] ?? "?").toUpperCase()}
                </div>
              ))}
              {listeners.length > 30 && (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>
                  +{listeners.length - 30}
                </div>
              )}
            </div>
          </div>
        )}

        {state.connected && state.participants.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 0", gap: "0.75rem", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(62,222,114,0.08)", border: "1px solid rgba(62,222,114,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎙️</div>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem" }}>You're the first one here.<br />Start talking — others will join.</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid var(--border)", background: "rgba(6,13,10,0.95)", backdropFilter: "blur(12px)" }}>
        {state.connected && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            {/* Leave */}
            <button
              onClick={handleLeave}
              style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, flexShrink: 0 }}
              title="Leave room"
            >
              👋
            </button>

            {/* Mic / request-to-speak */}
            {state.canSpeak ? (
              <button
                onClick={handleMuteTap}
                style={{
                  flex: 1, height: 52, borderRadius: 999, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "all 0.15s", border: "none",
                  background: state.isMuted ? "var(--loop-card)" : "var(--loop-green)",
                  color: state.isMuted ? "rgba(255,255,255,0.6)" : "var(--loop-bg)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {state.isMuted ? "🔇 Tap to unmute" : "🎙️ Tap to mute"}
              </button>
            ) : (
              <button
                onClick={handleRequestSpeak}
                style={{ flex: 1, height: 52, borderRadius: 999, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "all 0.15s", border: "1px solid rgba(62,222,114,0.4)", background: "rgba(62,222,114,0.08)", color: "var(--loop-green)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                🖐️ Request to speak
              </button>
            )}

            {/* Placeholder spacer */}
            <div style={{ width: 48 }} />
          </div>
        )}

        {!state.connected && !state.connecting && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => connect()} className="btn-primary">Reconnect</button>
            <button onClick={handleLeave} className="btn-ghost" style={{ maxWidth: 100 }}>Leave</button>
          </div>
        )}
      </div>
    </div>
  );
}
