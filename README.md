# loop-core

Loop — Africa's social audio platform. Live audio rooms for African communities.

## App

**`artifacts/loop-app/`** — React + Vite web app deployed to `loop.rald.cloud`

### Cloudflare Pages build settings

| Setting | Value |
|---------|-------|
| Framework preset | None |
| Build command | `npm install -g pnpm && pnpm install && pnpm --filter @workspace/loop-app run build` |
| Build output directory | `artifacts/loop-app/dist` |
| Root directory | `/` (repo root) |
| Node.js version | 18+ |

### Environment variables (Pages dashboard)

| Variable | Value |
|----------|-------|
| `BASE_URL` | `/` |

### Services

| Service | URL | Repo |
|---------|-----|------|
| Auth | `auth.rald.cloud` | `Ostinato-Loop/rald-auth-core` |
| Realtime | `realtime.rald.cloud` | `Ostinato-Loop/rald-realtime` |

### Stack

- React 18 + TypeScript
- Vite 5
- LiveKit (`livekit-client`) — audio rooms
- Wouter — client-side routing
- Plain CSS — no Tailwind, no component library

### User flow

1. Open → Onboarding (enter name + region)
2. Guest register → JWT stored in localStorage
3. Browse live rooms (auto-refreshes every 10s)
4. Tap room → Room detail
5. Join as listener or speaker → LiveKit WebRTC audio
6. Leave → back to browser

### Architecture

```
loop.rald.cloud (this repo)
      │
      ├── auth.rald.cloud      POST /auth/register → JWT
      │   (rald-auth-core)     GET  /auth/me
      │
      └── realtime.rald.cloud  GET  /rooms?product=loop
          (rald-realtime)      GET  /rooms/:id
                               POST /rooms              → creates room, stores in KV
                               POST /rooms/:id/join     → LiveKit JWT
                               POST /rooms/:id/leave
```
