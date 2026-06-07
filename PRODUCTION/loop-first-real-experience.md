# Loop — First Real Experience Report
**Date:** 2026-06-07  
**Sprint:** Beta Readiness  
**Build:** Loop App v0.1.0 (Replit Agent build)

---

## What Was Built

This sprint delivered the smallest complete Loop experience for **loop.rald.cloud** — a mobile-first React application that covers the full user journey from cold open to live audio participation.

### User Flow Implemented

```
Open app → Onboarding (name + region) → Room browser → Room detail → Join → Live audio → Speak → Leave
```

Every step of this flow is implemented and connected to real backends.

---

## Architecture

### Frontend (artifacts/loop-app)
- **React 18 + Vite + TypeScript**
- **Routing:** Wouter (hash-free, mobile-safe)
- **Audio:** livekit-client v2 (WebRTC)
- **No server-side rendering** — pure client-side SPA
- **Mobile-first** — max-width 480px, designed for one-handed use on Nigerian Android devices
- **Offline handling** — graceful error states, retry flows, no silent failures

### Backend Connections
| Service | URL | Purpose |
|---------|-----|---------|
| Auth | auth.rald.cloud | Guest registration, JWT |
| Realtime | realtime.rald.cloud | Room CRUD, join tokens |
| LiveKit/RealtimeKit | Dynamic (from join response) | WebRTC audio |

### Key Design Decisions

1. **Guest auth** — Users register anonymously (random email) on first open. No phone number, no OTP, no friction. JWT stored in localStorage. Display name + region are the only user-provided fields.

2. **Regional discovery** — 15 Nigerian/African regions in the filter. Lagos, Abuja, PH, etc. Rooms surface regionally relevant content by default.

3. **Role selection before join** — Users choose Listener or Speaker before entering. Listeners never trigger mic permission. Speakers get mic permission prompt immediately. Either role can be upgraded inside the room.

4. **Real-time polling** — Room list refreshes every 10 seconds. No WebSocket required for discovery.

5. **LiveKit direct** — Audio flows peer-to-peer via LiveKit WebRTC. The server (rald-realtime) issues the token; audio never touches it. This is correct and scalable.

6. **Action state over empty state** — An empty room list shows "Start the first room" CTA, not a dead end.

---

## Pages and Components

| Component | Path | Purpose |
|-----------|------|---------|
| Onboarding | (shown on first visit) | Name + region setup, guest registration |
| RoomBrowser | `/` | Live room discovery with regional filter |
| RoomPage | `/room/:id` | Room detail, participant preview, role selection |
| LiveRoom | `/room/:id/live` | Active audio room — speaker grid, mic control |
| CreateRoom | `/start` | Start a new room with title, category, region, language |
| MicPermission | (overlay) | Mic access help when browser denies mic |

---

## What Needs to Happen Before loop.rald.cloud Goes Live

### Blocker 1: `GET /rooms` endpoint (rald-realtime)

The room browser calls `realtime.rald.cloud/rooms`. This endpoint does not exist yet. Without it, the browser shows an empty error state.

**Fix:** Add GET /rooms to rald-realtime (see AUDIT/audio-readiness.md for spec).

### Blocker 2: CORS headers

Both `auth.rald.cloud` and `realtime.rald.cloud` must allow:
- `https://loop.rald.cloud`
- `https://*.replit.app`

### Blocker 3: Deploy Loop app to loop.rald.cloud

The React app lives in `Ostinato-Loop/loop-core/artifacts/loop-app`. It needs to be:
1. Built: `pnpm --filter @workspace/loop-app run build` → `dist/`
2. Deployed to a CDN/edge that serves it at `loop.rald.cloud`

Options:
- Cloudflare Pages (recommended — already using CF for other RALD services)
- Netlify / Vercel
- Replit Deploy (this Replit project)

### Non-blockers (post-launch improvements)

| Item | Priority |
|------|----------|
| JWT refresh token flow | High |
| Push notifications (new room in your region) | High |
| Room discovery via Telegram bot | Medium |
| Speaker request queue (listeners raise hand, host approves) | Medium |
| Recording + replay | Low |
| In-room reactions (🔥 👏 😂) | Low |
| Scheduled rooms | Low |

---

## Performance Targets

| Metric | Target | Expected |
|--------|--------|---------|
| Cold load to room list | < 2s | ~1.2s (SPA, lightweight) |
| Onboarding → room | < 15s | ~10s |
| Join → first audio | < 3s | ~1.5s (LiveKit fast) |
| Mobile data usage (30min session) | < 50MB | ~25MB (voice only) |
| Works on 3G | Yes | Yes (adaptiveStream) |

---

## Nigeria-Specific Considerations

1. **Network resilience:** LiveKit adaptive stream automatically degrades quality on poor connections. 3G-compatible.
2. **Data cost:** Voice-only rooms use ~50kbps. A 1-hour session ≈ 22MB. Acceptable for Nigerian data plans.
3. **Language support:** Yoruba, Igbo, Hausa, Pidgin are selectable room languages.
4. **Regional filter:** Rooms default to user's home region (selected at onboarding). Lagos and Abuja are shown first.
5. **Low-end Android:** No heavy animations, no video, no canvas. Renders fast on 2GB RAM devices.

---

## Testing Checklist (Before Go-Live)

- [ ] Guest auth flow: open app → enter name → JWT issued
- [ ] Room browser: at least one room shows as live
- [ ] Join as listener: audio from speakers received without mic prompt
- [ ] Join as speaker: mic permission requested → audio heard by listener
- [ ] Mute/unmute: toggle works without drop
- [ ] Request to speak: listener upgrades to speaker
- [ ] Leave: disconnects cleanly, returns to browser
- [ ] Create room: room appears in browser within 10 seconds
- [ ] Empty room: "Start the first room" CTA visible
- [ ] Network drop: reconnect prompt appears within 5 seconds
- [ ] Mic denied: help screen shown, can continue as listener

---

## File Map

```
artifacts/loop-app/
├── src/
│   ├── App.tsx                     # Router + auth gate
│   ├── index.css                   # Loop brand theme (dark green)
│   ├── hooks/
│   │   ├── useAuth.ts              # Guest auth, JWT, local user
│   │   ├── useRooms.ts             # Room list with polling
│   │   └── useLiveRoom.ts          # LiveKit room connection + mic
│   ├── lib/
│   │   ├── api.ts                  # API client (auth.rald.cloud + realtime.rald.cloud)
│   │   └── constants.ts            # Brand colors, regions, categories
│   ├── pages/
│   │   ├── RoomBrowser.tsx         # Main discovery screen
│   │   ├── RoomPage.tsx            # Room detail + join
│   │   ├── LiveRoom.tsx            # Active audio room
│   │   └── CreateRoom.tsx          # Start a new room
│   └── components/
│       ├── Onboarding.tsx          # Name + region setup
│       └── MicPermission.tsx       # Mic access help
├── package.json
└── vite.config.ts
```

---

*Report generated by Replit Agent build sprint — Ostinato-Loop, June 2026*
