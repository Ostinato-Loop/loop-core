import { useState } from "react";
import { Link } from "wouter";
import { useRooms } from "../hooks/useRooms";
import { type LocalUser } from "../hooks/useAuth";
import { NIGERIAN_REGIONS } from "../lib/constants";
import { type LoopRoom } from "../lib/api";
import VerificationBanner from "../components/VerificationBanner";

function LiveBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.7rem", fontWeight: 700, color: "var(--loop-green)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
      <span className="pulse-live" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--loop-green)", display: "inline-block" }} />
      LIVE
    </span>
  );
}

function RoomCard({ room }: { room: LoopRoom }) {
  const regionLabel = NIGERIAN_REGIONS.find((r) => r.id === room.region)?.label ?? room.region;
  const regionShort = NIGERIAN_REGIONS.find((r) => r.id === room.region)?.short ?? "🌍";

  return (
    <Link href={`/room/${encodeURIComponent(room.roomId)}`}>
      <div className="loop-card" style={{ padding: "1.25rem", cursor: "pointer", transition: "all 0.2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.875rem" }}>
          <LiveBadge />
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
            {regionShort} {regionLabel}
          </span>
        </div>

        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: "0.375rem" }}>
          {room.name}
        </h3>
        {room.description && (
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: "0.875rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {room.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(62,222,114,0.15)", border: "1px solid rgba(62,222,114,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
              {room.host?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{room.host}</p>
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>Host</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
              🎙️ <strong style={{ color: "rgba(255,255,255,0.75)" }}>{room.participantCount}</strong>
            </span>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: 999, background: "rgba(62,222,114,0.08)", border: "1px solid rgba(62,222,114,0.15)", color: "rgba(62,222,114,0.8)" }}>
              {room.category}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ActionStateEmpty({ region }: { region: string }) {
  const regionLabel = NIGERIAN_REGIONS.find((r) => r.id === region)?.label ?? "this region";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem", textAlign: "center", gap: "1.25rem" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(62,222,114,0.06)", border: "1px solid rgba(62,222,114,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>
        🎙️
      </div>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>No live rooms in {regionLabel}</h3>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem", lineHeight: 1.6 }}>
          Be the first to start a conversation. It only takes 10 seconds.
        </p>
      </div>
      <Link href="/start">
        <button className="btn-primary" style={{ maxWidth: 240 }}>
          Start a room →
        </button>
      </Link>
    </div>
  );
}

interface RoomBrowserProps {
  user: LocalUser;
}

export default function RoomBrowser({ user }: RoomBrowserProps) {
  const [selectedRegion, setSelectedRegion] = useState(user.region ?? "all");
  const { rooms, loading, error, lastUpdated, refresh } = useRooms(selectedRegion);

  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", background: "var(--loop-bg)", maxWidth: 480, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ padding: "1.25rem 1.25rem 0", position: "sticky", top: 0, background: "rgba(6,13,10,0.95)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
              Loop<span style={{ color: "var(--loop-green)" }}>.</span>
            </h1>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
              {lastUpdated ? `Updated ${Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago` : "Loading..."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={refresh} style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--loop-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }} title="Refresh">
              🔄
            </button>
            <Link href="/start">
              <button style={{ height: 36, borderRadius: 999, background: "var(--loop-green)", color: "var(--loop-bg)", fontWeight: 700, fontSize: "0.8rem", padding: "0 0.875rem", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                + Room
              </button>
            </Link>
          </div>
        </div>

        {/* Region filter */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: "1rem", scrollbarWidth: "none" }}>
          {NIGERIAN_REGIONS.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRegion(r.id)}
              style={{
                flexShrink: 0, padding: "0.375rem 0.875rem", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                background: selectedRegion === r.id ? "var(--loop-green)" : "var(--loop-card)",
                color: selectedRegion === r.id ? "var(--loop-bg)" : "rgba(255,255,255,0.55)",
                border: selectedRegion === r.id ? "none" : "1px solid var(--border)",
              }}
            >
              {r.short} {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Verification banner — scrolls with content, not sticky */}
      <VerificationBanner user={user} />

      {/* Content */}
      <div style={{ flex: 1, padding: "0.75rem 1.25rem 6rem" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", gap: 12, color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
            <span className="spinner" />
            Finding live rooms...
          </div>
        )}

        {error && !loading && (
          <div style={{ background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: "var(--radius-xl)", padding: "1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: 4 }}>Couldn't reach Loop servers</p>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", marginBottom: "0.875rem" }}>{error}</p>
            <button onClick={refresh} style={{ fontSize: "0.8rem", color: "var(--loop-green)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              Try again →
            </button>
          </div>
        )}

        {!loading && !error && rooms.length === 0 && (
          <ActionStateEmpty region={selectedRegion} />
        )}

        {!loading && rooms.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              {rooms.length} room{rooms.length !== 1 ? "s" : ""} live
            </p>
            {rooms.map((room) => <RoomCard key={room.roomId} room={room} />)}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(6,13,10,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", padding: "0.875rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(62,222,114,0.15)", border: "1px solid rgba(62,222,114,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--loop-green)" }}>
            {user.displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p style={{ fontSize: "0.8rem", fontWeight: 600 }}>{user.displayName}</p>
            <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{user.raldId}</p>
          </div>
        </div>
        <Link href="/start">
          <button style={{ background: "var(--loop-green)", color: "var(--loop-bg)", fontWeight: 700, fontSize: "0.875rem", padding: "0.625rem 1.25rem", borderRadius: 999, border: "none", cursor: "pointer" }}>
            🎙️ Start
          </button>
        </Link>
      </div>
    </div>
  );
}
