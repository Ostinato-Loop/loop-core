import { useState } from "react";
import { Link, useLocation } from "wouter";
import { createRoom } from "../lib/api";
import { type LocalUser } from "../hooks/useAuth";
import { NIGERIAN_REGIONS, ROOM_CATEGORIES, LANGUAGES } from "../lib/constants";

interface CreateRoomProps {
  user: LocalUser;
}

export default function CreateRoom({ user }: CreateRoomProps) {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(ROOM_CATEGORIES[0]);
  const [region, setRegion] = useState(user.region ?? "all");
  const [language, setLanguage] = useState("en");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    width: "100%", padding: "0.875rem 1rem",
    background: "var(--loop-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", color: "#fff", fontSize: "0.9rem",
    outline: "none", marginBottom: "0.125rem", transition: "border-color 0.15s",
    fontFamily: "inherit",
  };

  const handleCreate = async () => {
    if (name.trim().length < 3) { setError("Room name must be at least 3 characters"); return; }
    setCreating(true);
    setError("");
    try {
      const roomId = `loop-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      await createRoom({
        roomId,
        name: name.trim(),
        description: description.trim(),
        category,
        region,
        language,
        host: user.displayName,
      });
      navigate(`/room/${encodeURIComponent(roomId)}/live?role=host`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create room — check your connection");
      setCreating(false);
    }
  };

  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", background: "var(--loop-bg)", maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <Link href="/">
          <button style={{ background: "var(--loop-card)", border: "1px solid var(--border)", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>
            ←
          </button>
        </Link>
        <h1 style={{ fontWeight: 800, fontSize: "1.1rem" }}>Start a room</h1>
      </div>

      <div style={{ flex: 1, padding: "1.5rem 1.25rem", overflowY: "auto", paddingBottom: "7rem" }}>
        {/* Room name */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Room title *
          </label>
          <input
            autoFocus
            type="text"
            placeholder="What's the conversation about?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = "var(--loop-green)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Description
          </label>
          <textarea
            placeholder="Tell people what to expect..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
            onFocus={(e) => { e.target.style.borderColor = "var(--loop-green)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Category
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {ROOM_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: "0.375rem 0.875rem", borderRadius: 999, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: category === cat ? "rgba(62,222,114,0.12)" : "var(--loop-card)",
                  color: category === cat ? "var(--loop-green)" : "rgba(255,255,255,0.5)",
                  border: `1px solid ${category === cat ? "rgba(62,222,114,0.3)" : "var(--border)"}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Region */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {NIGERIAN_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.short} {r.label}</option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Primary Language
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                style={{
                  padding: "0.375rem 1rem", borderRadius: 999, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: language === lang.id ? "rgba(62,222,114,0.12)" : "var(--loop-card)",
                  color: language === lang.id ? "var(--loop-green)" : "rgba(255,255,255,0.5)",
                  border: `1px solid ${language === lang.id ? "rgba(62,222,114,0.3)" : "var(--border)"}`,
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: "var(--radius-lg)", padding: "0.875rem", marginBottom: "1rem" }}>
            <p style={{ color: "#FF6B6B", fontSize: "0.85rem" }}>{error}</p>
          </div>
        )}
      </div>

      {/* Start button */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "1.25rem", background: "rgba(6,13,10,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)" }}>
        <button className="btn-primary" onClick={handleCreate} disabled={creating || name.trim().length < 3}>
          {creating
            ? <><span className="spinner" style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 8 }} />Creating room...</>
            : "🎙️ Go live now"}
        </button>
      </div>
    </div>
  );
}
