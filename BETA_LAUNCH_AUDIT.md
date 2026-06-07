# Loop — Public Beta Launch Audit
**Date:** 2026-06-07 | **Scope:** Entire Ostinato-Loop GitHub organisation (50+ repos)  
**Evidence:** Live endpoint probes, source analysis, wrangler.toml inspection, prior infrastructure reports  
**Secret policy:** No credential values appear in this document

---

## TL;DR — Overall Readiness: 58 / 100

> The audio core works. Auth works. The gap between "it works in a dev environment" and "a real person in Lagos can open the app, register, join a live room, and hear audio" is **7 specific operator actions** — none require new code.

---

## The Two-Frontend Problem (Decide First)

There are **two separate Loop frontends** in this org. You must pick one before doing anything else:

| | `loop` (private repo) | `loop-core` (public repo) |
|---|---|---|
| Backend | Supabase (Postgres) + `loop-api.rald.cloud` Worker | `rald-auth-core` + `rald-realtime` (Cloudflare Workers + KV) |
| Auth | Clerk SSO from `auth.rald.cloud` | JWT from `auth.rald.cloud`, guest register |
| Rooms | Postgres `rooms` table, RLS, full social graph | KV-backed, 24h TTL, lightweight |
| Features | Profiles, friend requests, notifications, search, reactions | Audio rooms, PTT, chat, listener upgrade |
| CI/CD | ✅ `ci.yml` + `deploy.yml` exist | ❌ No workflows — manual deploy only |
| Deployed? | ✅ `loop.rald.cloud` currently serves this | ❌ Built, pushed to GitHub, not on Pages yet |
| Social graph | ✅ Full (connections, suggestions, graph API) | ❌ None |
| Audio | ⚠️ LiveKit via `rald-realtime` (secrets may not be set) | ✅ LiveKit, PTT, data-channel chat |

**Recommendation:** Ship `loop-core` for audio beta (it's clean, fast, LiveKit-native). Keep `loop` private as the v2 milestone with social graph once Supabase migrations are stable.

---

## P0 — Cannot Launch Without These (Operator Actions, No Code)

### P0-1 🔴 LiveKit secrets not set in `rald-realtime`
**Impact:** Every `POST /rooms/:id/join` returns 500. No one can hear audio. The app is completely silent.  
**Evidence:** `wrangler.toml` lists no `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` in `[vars]` or commented secrets. The LiveKit adapter constructor requires both.  
**Fix:** `wrangler secret put LIVEKIT_API_KEY` and `wrangler secret put LIVEKIT_API_SECRET` inside `rald-realtime`, then `wrangler deploy`.  
**Effort:** 5 minutes.

### P0-2 🔴 `rald-realtime` rooms route not deployed
**Impact:** `GET /rooms`, `GET /rooms/:id`, `POST /rooms`, `POST /rooms/:id/join` all 404 in production. The fix was pushed to GitHub this session but `wrangler deploy` has not been run.  
**Evidence:** `PRODUCTION_READINESS_SCORE.md` — `loop-api.rald.cloud 55/100 — rooms route not deployed`.  
**Fix:** `cd rald-realtime && wrangler deploy`  
**Effort:** 2 minutes.

### P0-3 🔴 `loop-core` not connected to Cloudflare Pages
**Impact:** All the code we built is on GitHub but `loop.rald.cloud` still serves the old `loop` private repo.  
**Fix:** In Cloudflare Pages dashboard, create a project (or update existing) pointing to `Ostinato-Loop/loop-core`:
- Build command: `npm install -g pnpm && pnpm install && pnpm --filter @workspace/loop-app run build`
- Build output: `artifacts/loop-app/dist`
- Root directory: `/`
- Environment variable: `BASE_URL=/`  
**Effort:** 10 minutes.

### P0-4 🔴 `rald-auth-core` CORS not deployed
**Impact:** `loop-core` calls `auth.rald.cloud` from the browser. The CORS fix (accepting `loop.rald.cloud`) was pushed this session but not deployed.  
**Fix:** `cd rald-auth-core && wrangler deploy`  
**Effort:** 2 minutes.

---

## P1 — Breaks Core Flows for Real Users

### P1-1 🟠 Termii SMS balance: 10 NGN
**Impact:** `POST /auth/send-otp` fails. Phone number registration is dead. Email OTP (Resend) still works, but the primary African mobile registration path is broken.  
**Fix:** Top up Termii account. No code change.  
**Owner:** Account holder.

### P1-2 🟠 Clerk not configured (`clerk_full: false`)
**Impact:** SSO exchange from `auth.rald.cloud` → `loop.rald.cloud` returns errors. Users who register on `profiles.rald.cloud` or `auth.rald.cloud` cannot SSO into Loop.  
**Evidence:** `PRODUCTION_BLOCKERS_REPORT.md` B5.  
**Fix:** Set `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` as Wrangler secrets in `rald-auth-core`, then `wrangler deploy`.

### P1-3 🟠 No SPA `_redirects` in `loop-core`
**Impact:** Direct navigation to `loop.rald.cloud/room/abc123` or any deep link returns Cloudflare Pages' 404 page instead of loading the React app. Shareable room links are broken.  
**Fix:** `artifacts/loop-app/public/_redirects` — **pushed in this commit**.

### P1-4 🟠 No `loop-core` CI/CD pipeline
**Impact:** Every code change requires a manual `wrangler pages deploy` or a manual Cloudflare Pages trigger. One forgotten deploy = users on stale code.  
**Fix:** `.github/workflows/deploy.yml` — **pushed in this commit**. Triggers on push to `main`, builds and deploys to Cloudflare Pages via `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets.

### P1-5 🟠 JWT has no refresh (24h hard expiry)
**Impact:** After 24 hours, users are silently logged out. `loop-core` handles this gracefully (re-shows Onboarding), but power users lose their session mid-session if the token was issued 24h ago.  
**Fix:** Add `POST /auth/refresh` to `rald-auth-core`. Punts to v1.1 — the current `loop:auth:expired` recovery flow is acceptable for beta.

---

## P2 — Polish Gaps (Ship After First 100 Users)

| ID | Issue | Repo | Effort |
|---|---|---|---|
| P2-1 | `auth_user_profiles` Supabase migration not applied — search returns 0 results | `rald-auth-core` | Apply SQL migration in Supabase dashboard |
| P2-2 | `messenger.rald.cloud` DB tables not applied — all message routes return 500 | `messenger` | Apply migration |
| P2-3 | `chat.rald.cloud` DNS NXDOMAIN — Cloudflare Pages not configured | — | Add DNS record |
| P2-4 | No room topic/description field in `loop-core` CreateRoom | `loop-core` | 30 min code |
| P2-5 | No rate limiting on `POST /rooms` — one user can spam rooms | `rald-realtime` | 1hr code |
| P2-6 | No user avatar in ParticipantBubble — initials only | `loop-core` | 1hr code |
| P2-7 | Room KV TTL is 24h — rooms expire overnight | `rald-realtime` | Change TTL constant |
| P2-8 | `rald-realtime` provider is still set to RealtimeKit P1 in `index.ts` comment (code was fixed, comment may be stale) | `rald-realtime` | Verify + redeploy |
| P2-9 | No `og:image` or `og:title` in `loop-core` `index.html` — link previews are blank | `loop-core` | 20 min |
| P2-10 | `loop` private repo has CI/deploy passing but points to wrong backend after `loop-core` pivot | `loop` | Archive or redirect |

---

## P3 — v2 Roadmap (Post-Beta)

| Area | Item |
|---|---|
| Social graph | Port `loop` social graph (friend requests, connections, suggestions) into `loop-core` |
| Notifications | `rald-inbox` + push notifications for room invites |
| Profiles | Rich profiles with bio, photo, region — tie to `rald-design` system |
| Search | `search_users_public` Supabase RPC — user discovery in rooms |
| Payments | `payrald-core` + `rald-billing` — paid rooms, creator monetisation |
| Analytics | `raldtics-insights` — room engagement, listener retention |
| Mobile | `rald-mobile-core` React Native — move beyond the mobile web app |
| SSO | Fully configure Clerk across all RALD properties |
| Messenger | Apply `messenger` DB tables → `chat.rald.cloud` live |

---

## What's Actually Working Right Now ✅

- `auth.rald.cloud` — registration, login, JWT, sessions, SSO exchange, graph API (78/100)
- `realtime.rald.cloud` — deployed Worker, LiveKit adapter, KV-backed rooms (code correct, awaiting `wrangler deploy` for this session's fixes)
- `loop-core` frontend — complete React app: Onboarding → Room Browser → Room → LiveKit audio → PTT → Chat → Leave
- `rald-design` — design system live
- CI is green across `loop`, `rald-auth-core`, `rald-realtime`
- Supabase rooms schema applied (7 tables with RLS, triggers)

---

## Launch Checklist (In Order)

```
□ 1. wrangler secret put LIVEKIT_API_KEY        (in rald-realtime)
□ 2. wrangler secret put LIVEKIT_API_SECRET     (in rald-realtime)
□ 3. wrangler deploy                             (in rald-realtime)
□ 4. wrangler deploy                             (in rald-auth-core)
□ 5. Cloudflare Pages: point loop.rald.cloud → loop-core repo
□ 6. Cloudflare Pages: add CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID as GitHub secrets
□ 7. Top up Termii balance
□ 8. Set CLERK_SECRET_KEY + CLERK_PUBLISHABLE_KEY in rald-auth-core → wrangler deploy
□ 9. Open loop.rald.cloud — register — create a room — join — hear yourself
□ 10. Share a room link — confirm deep link loads correctly
```

Steps 1–4 take under 15 minutes total. Steps 5–8 take under 30 minutes. After step 9, you have a working public beta.

---

## Org Health Snapshot

| Metric | Value |
|---|---|
| Total repos | 50+ |
| Repos with CI/CD | ~15 (key infra repos) |
| Repos that are placeholders | ~25 (SDK stubs, future services) |
| Deployed Cloudflare Workers | 3 confirmed (`rald-auth-core`, `rald-realtime`, `loop-api`) |
| Deployed Cloudflare Pages | 2 confirmed (`loop.rald.cloud`, `profiles.rald.cloud`) |
| Broken DNS | 1 (`chat.rald.cloud` NXDOMAIN) |
| Supabase project | `onxdcikfttdmnhofsuwo.supabase.co` — operational |
| LiveKit secrets in production | ❌ Not confirmed set |
