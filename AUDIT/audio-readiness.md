# Loop Audio Readiness Report
**Date:** 2026-06-07  
**Service audited:** `rald-realtime` (Cloudflare Worker at `realtime.rald.cloud`)  
**Providers:** Cloudflare RealtimeKit (P1) → LiveKit (P2) → Tencent TRTC (P3)

---

## Summary Verdict

**Audio is 40% ready.**

The server-side abstraction layer is well-engineered. Provider failover, JWT token generation, room lifecycle management, rate limiting, and audit logging are all implemented. However, the client-side integration is absent, one critical server method is a stub, and provider secret configuration cannot be verified. A user cannot hear audio today.

---

## Backend Readiness (Server-Side)

### What is fully implemented ✅

| Component | Details |
|-----------|---------|
| Provider registry | RealtimeKit → LiveKit → Tencent, priority failover via `withFailover()` |
| `POST /rooms` | Creates room on provider, writes audit log, returns `{ roomId, providerRoomId, provider, createdAt }` |
| `POST /rooms/:id/join` | Generates JWT access token per provider, returns `{ token, serverUrl, providerRoomId }` |
| `POST /rooms/:id/leave` | Removes participant from provider room |
| `GET /rooms/:id/participants` | Lists active participants with role and audio state |
| `POST /calls/start` | Starts a call session in a room |
| `POST /calls/:id/end` | Ends call, writes duration to audit log |
| `POST /calls/:id/record` | Starts Egress recording (LiveKit) |
| Rate limiting | Per-user, per-action limits enforced via Cloudflare KV |
| Audit logging | Every room/call event written to `AUDIT_LOG` KV |
| CORS | Allows `loop.rald.cloud`, `messenger.rald.cloud`, `business.rald.cloud`, `localhost` |
| JWT auth | HMAC-SHA256 signed tokens, 1-hour expiry, role-based grants |
| Health endpoint | `GET /health/providers` checks all three providers' latency |

### What is incomplete or broken ⚠️

#### 1. `publishAudio()` is a stub — CRITICAL
```typescript
// LiveKit adapter — src/providers/livekit.ts
async publishAudio(_roomId: string, userId: string): Promise<{ trackId: string }> {
  return { trackId: `lk-audio-${userId}-${Date.now()}` };
}
```
This method returns a **fake track ID**. It does not:
- Negotiate a WebRTC SDP offer/answer
- Connect to LiveKit's media server
- Open a media track
- Perform any network operation

**Impact:** Any client that calls `publishAudio()` via the API will receive a fake track ID and will not actually transmit audio. The same stub exists for `publishVideo()`, `subscribeAudio()`, and `subscribeVideo()`.

**Root cause:** WebRTC track negotiation must happen on the **client side** using the LiveKit JS/RN SDK — not on the server. The server's role is to issue a token (which is correctly implemented). The client connects directly to LiveKit using that token. The `publishAudio()` server method is architecturally unnecessary and should be removed to avoid confusion.

#### 2. Provider secrets — cannot verify ⚠️
`wrangler.toml` contains only non-secret variables:
```toml
[vars]
ENVIRONMENT = "production"
RALD_AUTH_URL = "https://auth.rald.cloud"
```

The following secrets **must** be set via `wrangler secret put` and are not visible in the repo:
- `RALD_JWT_SECRET` — required for every API call (auth)
- `CALLS_APP_ID` + `CALLS_APP_SECRET` — Cloudflare RealtimeKit (P1)
- `LIVEKIT_URL` + `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` — LiveKit (P2)
- `TENCENT_SDK_APP_ID` + `TENCENT_SECRET_KEY` — Tencent TRTC (P3)

If `RALD_JWT_SECRET` is absent: every request returns 401.  
If all provider secrets are absent: cold-start returns 503.

**Verify with:** `wrangler secret list --name rald-realtime`

#### 3. No `GET /rooms` (active room list) — CRITICAL for UX
No endpoint exists to list currently active rooms. This means:
- Users cannot discover rooms that exist
- The room browser (if built) has nothing to display
- Loop cannot show "3 rooms live now" without this endpoint

**Fix:** Add `GET /rooms` that queries the provider (LiveKit: `ListRooms` Twirp API) and returns active room metadata including participant count.

---

## Client-Side Readiness

### `loop-core` repository
```
loop-core/
├── .github/
├── BRAND.md      ← brand colors only
└── README.md     ← one line description
```

**There is no client application.** Zero React/React Native files, zero LiveKit client SDK integration, zero audio room UI.

### What the client must implement to deliver working audio

| Step | What | SDK / Method |
|------|------|-------------|
| 1 | Call `POST /rooms` to create or verify room | Fetch API |
| 2 | Call `POST /rooms/:id/join` to get LiveKit token + serverUrl | Fetch API |
| 3 | Connect to LiveKit room using token | `livekit-client` → `Room.connect(serverUrl, token)` |
| 4 | Request microphone permission | Browser `getUserMedia()` / RN `Audio.requestPermissionsAsync()` |
| 5 | Create and publish local audio track | `createLocalAudioTrack()` → `room.localParticipant.publishTrack()` |
| 6 | Subscribe to remote audio tracks | `room.on(RoomEvent.TrackSubscribed, ...)` |
| 7 | Render speaker grid with participant list | React component with real-time state |
| 8 | Handle role change (listener → speaker request) | Room metadata update via LiveKit |
| 9 | Handle room end / participant left events | `RoomEvent.Disconnected`, `RoomEvent.ParticipantDisconnected` |

Steps 1–2 are server-complete. Steps 3–9 have zero client code.

---

## Provider-Specific Notes

### Cloudflare RealtimeKit (Priority 1)
- Adapter: `src/providers/realtimekit.ts`
- Requires: `CALLS_APP_ID`, `CALLS_APP_SECRET`
- Status: Implementation exists. Secret configuration unverified.

### LiveKit (Priority 2)
- Adapter: `src/providers/livekit.ts`
- Requires: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Token generation: ✅ Correct HMAC-SHA256 JWT structure
- Room creation: ✅ Calls LiveKit `CreateRoom` Twirp API
- Participant listing: ✅ Calls `ListParticipants` Twirp API
- Recording: ✅ Calls `StartRoomCompositeEgress`
- `publishAudio/Video/subscribeAudio/Video`: ❌ All stubs — remove from server

### Tencent TRTC (Priority 3)
- Adapter: `src/providers/tencent.ts`
- Requires: `TENCENT_SDK_APP_ID`, `TENCENT_SECRET_KEY`
- Status: Implementation exists. Secret configuration unverified.

---

## Audio Readiness Checklist

```
Server
[ ] Confirm wrangler secret list shows RALD_JWT_SECRET
[ ] Confirm at least one provider secret set (LIVEKIT_API_SECRET preferred)
[ ] Run GET /health/providers and verify latencyMs < 1000 for at least one provider
[ ] Add GET /rooms (ListRooms from LiveKit)
[ ] Remove stub publishAudio/publishVideo/subscribeAudio/subscribeVideo from server adapters

Client
[ ] Create loop-core React (web) or React Native (mobile) app
[ ] Install livekit-client (web) or @livekit/react-native (mobile)
[ ] Implement join flow: POST /rooms/:id/join → Room.connect(serverUrl, token)
[ ] Implement microphone permission + track publish
[ ] Implement remote track subscription + audio playback
[ ] Implement speaker grid UI (participant bubbles, mute state)
[ ] Implement listener count display
[ ] Implement request-to-speak (raise hand) interaction
[ ] Handle room events: participant join/leave, track mute/unmute, room close

End-to-end test
[ ] Two devices in same room — Device A hears Device B
[ ] Listener joins — cannot publish audio
[ ] Host grants speaker — participant can publish
[ ] Room ends — all participants see end screen
[ ] Provider failover — kill LiveKit, verify Tencent TRTC activates
```

---

## Time-to-Working-Audio Estimate

| Scope | Effort | Outcome |
|-------|--------|---------|
| Secrets verified + GET /rooms added | 1 hour | Backend confirmed live |
| Minimal web audio room (join + speak + listen) | 3–5 days | Two people can talk |
| Full speaker grid + role management | 1 week | Room feels professional |
| Mobile (React Native) audio room | 2 weeks | App-native experience |
| Recording + playback + room history | 3 weeks | Full Loop audio feature |

**The 3-day version is enough to prove the product works.**
