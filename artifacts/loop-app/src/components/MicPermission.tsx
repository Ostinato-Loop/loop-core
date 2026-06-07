interface MicPermissionProps {
  onDismiss: () => void;
}

export default function MicPermission({ onDismiss }: MicPermissionProps) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,13,10,0.92)", zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "1.5rem",
    }}>
      <div style={{
        background: "var(--loop-card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-2xl)", padding: "2rem", width: "100%", maxWidth: 440,
      }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,100,100,0.12)", border: "1px solid rgba(255,100,100,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: 24 }}>🎤</span>
        </div>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: 8 }}>Microphone access needed</h3>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          To speak in this room, Loop needs access to your microphone. Here's how to enable it:
        </p>
        <ol style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", lineHeight: 2, paddingLeft: "1.25rem", marginBottom: "1.5rem" }}>
          <li>Tap the <strong style={{ color: "#fff" }}>🔒 lock icon</strong> in your browser's address bar</li>
          <li>Find <strong style={{ color: "#fff" }}>Microphone</strong> and set it to <strong style={{ color: "var(--loop-green)" }}>Allow</strong></li>
          <li>Reload this page, then rejoin the room</li>
        </ol>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginBottom: "1.25rem" }}>
          You can still listen to the room without microphone access.
        </p>
        <button className="btn-ghost" onClick={onDismiss}>Continue as listener</button>
      </div>
    </div>
  );
}
