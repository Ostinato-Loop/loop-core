import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { getParticipants, listRooms, type LoopRoom } from "../lib/api";
import { type LocalUser } from "../hooks/useAuth";
import { NIGERIAN_REGIONS, ROOM_CATEGORIES } from "../lib/constants";

interface RoomPageProps {
  roomId: string;
  user: LocalUser;
}

export default function RoomPage({ roomId, user }: RoomPageProps) {
  const [, navigate] = useLocation();
  const [room, setRoom] = useState<LoopRoom | null>(null);
  const [participants, setParticipants] = useState<Array<{ userId: string; role: string; audioEnabled: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [role, setRole] = useState<"listener" | "speaker">("listener");

  useEffect(() => {
    (async () => {
      try {
        const rooms = await listRooms();
        const found = rooms.find((r) => r.roomId === roomId);
        setRoom(found ?? null);
        if (found) {
          const pts = await getParticipants(roomId);
          setParticipants(pts);
        }
      } catch { /* non-fatal */ }
      finally { setLoading(false); }
    })();
  }, [roomId]);

  const handleJoin = async () => {
    setJoining(true);
    navigate(`/room/${encodeURIComponent(roomId)}/live?role=${role}`);
  };

  const regionLabel = room ? (NIGERIAN_REGIONS.find((r) => r.id === room.region)?.label ?? room.region) : "";
  const regionShort = room ? (NIGERIAN_REGIONS.find((r) => r.id === room.region)?.short ?? "🌍") : "";

  if (loading) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--loop-bg)" }}>
        <span className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", background: "var(--loop-bg)", gap: "1rem", textAlign: "center" }}>
        <span style={{ fontSize: 40 }}>👋</span>
        <h2 style={{ fontWeight: 700 }}>Room has ended</h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem" }}>This conversation has wrapped up.</p>
        <Link href="/"><button className="btn-primary" style={{ maxWidth: 200 }}>Browse rooms</button></Link>
      </div>
    );
  }

  const speakers = participants.filter((p) => p.role === "speaker" || p.audioEnabled);
  const listeners = participants.filter((p) => !p.audioEnabled && p.role !== "speaker");

  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", background: "var(--loop-bg)", maxWidth: 480, margin: "0 auto" }}>
      {/* Back header */}
      <div style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <Link href="/">
          <button style={{ background: "var(--loop-card)", border: "1px solid var(--border)", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>
            ←
          </button>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="pulse-live" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--loop-green)", display: "inline-block" }} />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--loop-green)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Live</span>
          </div>
        </div>
        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{room.participantCount} in room</span>
      </div>

      {/* Room info */}
      <div style={{ padding: "1.5rem 1.25rem", flex: 1 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 999, background: "rgba(62,222,114,0.08)", border: "1px solid rgba(62,222,114,0.2)", color: "var(--loop-green)" }}>
            {room.category}
          </span>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.75rem", borderRadius: 999, background: "var(--loop-card)", border: "1px solid var(--border)", color: "rgba(255,255,255,0.5)" }}>
            {regionShort} {regionLabel}
          </span>
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.2, marginBottom: "0.75rem" }}>{room.name}</h1>
        {room.description && (
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>{room.description}</p>
        )}

        {/* Host */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.75rem", padding: "0.875rem", background: "var(--loop-card)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(62,222,114,0.15)", border: "1px solid rgba(62,222,114,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "var(--loop-green)", flexShrink: 0 }}>
            {room.host?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{room.host}</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Host · Started {new Date(room.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>

        {/* Speakers */}
        {speakers.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              {speakers.length} speaking
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {speakers.slice(0, 12).map((p) => (
                <div key={p.userId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(62,222,114,0.12)", border: "2px solid var(--loop-green)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "var(--loop-green)" }}>
                    {p.userId?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>🎙️</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {listeners.length > 0 && (
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>
            👂 {listeners.length} listening
          </p>
        )}
      </div>

      {/* Join panel */}
      <div style={{ padding: "1.25rem", borderTop: "1px solid var(--border)", background: "rgba(6,13,10,0.95)", backdropFilter: "blur(12px)" }}>
        {/* Role selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
          <button
            onClick={() => setRole("listener")}
            style={{ flex: 1, padding: "0.625rem", borderRadius: "var(--radius-lg)", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${role === "listener" ? "var(--loop-green)" : "var(--border)"}`, background: role === "listener" ? "rgba(62,222,114,0.1)" : "var(--loop-card)", color: role === "listener" ? "var(--loop-green)" : "rgba(255,255,255,0.5)", transition: "all 0.15s" }}
          >
            👂 Join as listener
          </button>
          <button
            onClick={() => setRole("speaker")}
            style={{ flex: 1, padding: "0.625rem", borderRadius: "var(--radius-lg)", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${role === "speaker" ? "var(--loop-green)" : "var(--border)"}`, background: role === "speaker" ? "rgba(62,222,114,0.1)" : "var(--loop-card)", color: role === "speaker" ? "var(--loop-green)" : "rgba(255,255,255,0.5)", transition: "all 0.15s" }}
          >
            🎙️ Join as speaker
          </button>
        </div>
        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: "0.875rem" }}>
          {role === "speaker" ? "You'll need microphone access to speak" : "Listen without a microphone — switch to speaker anytime"}
        </p>
        <button className="btn-primary" onClick={handleJoin} disabled={joining}>
          {joining ? <><span className="spinner" style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 8 }} />Joining...</> : "Enter room →"}
        </button>
      </div>
    </div>
  );
}
