# Loop V1 Aliveness Audit
**Date:** 2026-06-07  
**Auditor:** Replit Agent (on behalf of Ostinato-Loop)  
**Method:** Full codebase read across all 67 Ostinato-Loop GitHub repositories  
**Mission:** Audit Loop from the perspective of a real first-time user

---

## Executive Summary

Loop is architecturally impressive and dangerously invisible. The RALD ecosystem has real infrastructure — three audio providers with failover, a working auth system, a messaging backend, a customer graph, 7 AI agents — but from a first-time user's perspective, **almost none of it is reachable, visible, or alive.**

A user landing on Loop today cannot:
- Find a room to join within 5 minutes
- Understand what Loop is within 10 seconds
- Meet another person in under 5 minutes
- Feel the product has a heartbeat

**Core verdict:** Loop V1 is infrastructure with a marketing skin. It needs a user surface.

---

## Audit by Priority

---

### Priority 1 — Audio

**Status: Backend exists. Client integration missing. Provider secrets unverified.**

#### What exists
| Component | Status |
|-----------|--------|
| `rald-realtime` Cloudflare Worker | Deployed at `realtime.rald.cloud` |
| Provider chain | Cloudflare RealtimeKit (P1) → LiveKit (P2) → Tencent TRTC (P3) |
| Room API | `POST /rooms`, `POST /rooms/:id/join`, `POST /rooms/:id/leave`, `GET /rooms/:id/participants` |
| Call API | `POST /calls/start`, `POST /calls/:id/end`, `POST /calls/:id/record` |
| Health/Analytics | `GET /health`, `GET /health/providers`, `GET /analytics/summary` |
| JWT token generation | HMAC-SHA256, LiveKit-compatible |
| Failover routing | Provider priority enforced in `lib/router.ts` |

#### What is broken or missing
1. **Provider secrets not in `wrangler.toml`** — `CALLS_APP_SECRET`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `TENCENT_SECRET_KEY`, `RALD_JWT_SECRET` must all exist as Cloudflare Worker secrets. If any provider secret is absent, the service cold-starts with a 503. No confirmation these are set.
2. **`publishAudio()` is a stub** — LiveKit adapter's `publishAudio()` returns `{ trackId: "lk-audio-{userId}-{timestamp}" }`. It does not negotiate a WebRTC track, does not set up an SDP offer/answer, does not connect to a media server. This is a placeholder, not working audio.
3. **No client-side audio UI** — `loop-core` repo (the supposed Loop social audio application) contains only `README.md` and `BRAND.md`. No React app, no LiveKit client SDK, no room component, no microphone permission flow.
4. **`loop.rald.cloud` state unknown** — The Products page links to `https://loop.rald.cloud` as an external URL. This domain is not backed by any repository in the org. If it is a separate deployment, its state cannot be audited.
5. **No room discovery endpoint** — There is no `GET /rooms` endpoint to list active rooms. A user cannot see rooms that exist.

#### What a real user experiences
User clicks "Loop" on the Products page → opens `https://loop.rald.cloud` → unknown. If not deployed: blank page or 404.

---

### Priority 2 — Dead Routes, Dead CTAs, Dead Screens

**Status: Most navigation leads to marketing copy or external unknowns.**

#### Dead external links
| Link | Where shown | State |
|------|-------------|-------|
| `https://loop.rald.cloud` | Products page card | No repo backing it |
| `https://messenger.rald.cloud` | Products page card | No repo backing it |
| `https://profiles.rald.cloud` | RALD Identity landing "Sign In" | No repo found |
| `https://profile.rald.cloud` | RALD Identity footer | No repo found |

#### Dead internal CTAs
| CTA text | Route | What happens |
|----------|-------|--------------|
| "Get Early Access to Loop Messenger" | `/messenger` landing | No form, no email capture, dead button |
| "Give your app a voice." | `/voice` landing | No form, no action behind CTA |
| "Join with a Referral Code" | `/referral` | Route exists, but referral flow completeness unknown |
| "Ready to sell smarter?" | `/loop` (Loop Business) | No form or redirect |
| "Sign In" | Identity nav | Points to `https://profiles.rald.cloud` — unknown state |
| Control dashboard `/control/*` | Auth-gated | Depends on `auth.rald.cloud` being live and correctly configured |

#### Empty/stub repositories (3KB each, no code)
`loop-core`, `loop-admin`, `loop-business`, `loop-domains`, `loop-storefronts`, `loop-logistics`, `loop-meta-cloud`, `loop-dispatch`, `loop-voice`, `payrald-core`, `payrald-wallet`, `payrald-cards`, `payrald-checkout`, `payrald-api`, `payrald-merchant`, `payrald-admin`, `payrald-settlements`, `payrald-risk`, `rald-auth`, `rald-event-bus`, `rald-billing`, `rald-fraud`, `rald-compliance`, `gitrald-*` (8 repos), `rald-sdk-*` (6 repos), and more.

**These repositories are brand stubs.** The marketing describes services that don't have code yet.

---

### Priority 3 — Empty States → Action States

**Status: Every screen with potential for live data shows static marketing copy.**

#### Screens that must become action states

| Screen | Current state | What it must show |
|--------|---------------|-------------------|
| Products `/` | Static grid of 12 product cards | "3 rooms live now" · "Last joined 4 min ago" · live pulse |
| Loop landing `/loop` | Static feature list | Real merchant count OR "Be merchant #1 in your region" |
| Control dashboard `/control` | Unknown (auth-gated) | Live ecosystem health, real metrics |
| `loop.rald.cloud` (if exists) | Unknown | Room browser with live participant counts |
| Audio room | Doesn't exist | Real-time speaker grid, listener count, request-to-speak |

#### AI Agents section (Products page)
Currently shows: "6 agents active · 1 on standby · 0 alerts · all systems nominal"  
This is **hardcoded static HTML**. It communicates no real system state.  
Must either: pull from `GET /health/providers` (realtime) or show honest "coming soon" state.

---

### Priority 4 — Profiles

**Status: RALD ID exists as a concept. No user-visible profile surface found.**

#### What exists
- RALD Identity Worker at `auth.rald.cloud` — auth/register, auth/login, OTP flows, session management
- `GET /auth/me` → returns authenticated user with `raldId` (e.g. `RALD-A3F9KZ`)
- `rald-identity` React app = developer documentation page, not a user profile
- `loop-crm` → customer graph with channels, segments, timelines (B2B CRM, not user profiles)

#### What is missing
- No public user profile page (`/@username` or `/profile/:id`)
- No profile photo upload, bio, location/region field
- No trust level indicator visible to other users
- No community affiliations shown on profile
- No "rooms hosted" or "communities joined" history
- `profiles.rald.cloud` referenced in code but not backed by any repo

---

### Priority 5 — Discovery

**Status: Doesn't exist for the social layer. Products page is the only "discovery" surface.**

The Products page lists 12 products. It does not surface:
- Live or recent rooms
- Active communities
- People to follow
- Regional activity ("3 rooms happening in Lagos right now")
- Trending topics or conversations

There is no `GET /rooms` endpoint. There is no community/people search. The `rald-search` repo (69KB TypeScript) exists — its capabilities are not integrated into any user-facing discovery screen.

---

### Priority 6 — Messaging

**Status: Messaging infrastructure exists for B2B support. Not native to Loop social layer.**

#### rald-inbox (Cloudflare Worker)
- Routes: conversations, messages, assignments, tags, views, SLA, analytics, audit
- Channels: `email`, `internal`, `notification` — no real-time WebSocket channel
- This is a **helpdesk/support inbox**, not a social DM or community messaging system

#### rald-realtime
- Has call/room infrastructure
- No persistent message storage — rooms are ephemeral audio sessions

#### Loop Messenger (`messenger.rald.cloud`)
- Described as: "Offline-first E2E encrypted messaging, voice notes, threads — works at 2G"
- No code repository backs this product
- External URL link from Products page — unknown state

**Gap:** There is no native, real-time, persistent social messaging layer in any reviewed repository.

---

## Overall Aliveness Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Audio infrastructure | 4/10 | Backend exists, no client, publishAudio is a stub |
| Route completeness | 2/10 | Most routes lead to dead ends or unknowns |
| Empty state quality | 1/10 | All screens are static marketing |
| Profile surface | 1/10 | RALD ID exists, no UI |
| Discovery | 0/10 | Not implemented |
| Messaging | 2/10 | B2B inbox only, no social layer |
| **Overall V1 aliveness** | **2/10** | Infrastructure-ready, user-surface missing |

---

## Top 5 Actions to Make Loop Feel Alive This Week

1. **Deploy `loop.rald.cloud`** — The room browser. Even a static list of 3 "seed" rooms makes the product feel inhabited.
2. **Wire LiveKit client SDK to `/rooms/:id/join`** — The backend token flow works. The client connection is the missing 20% that unlocks 80% of the audio experience.
3. **Confirm Cloudflare Worker secrets are set** — Run `wrangler secret list --name rald-realtime`. If `LIVEKIT_API_SECRET` is absent, audio is dead regardless of code quality.
4. **Add `GET /rooms` (active rooms list)** — 10 lines of code. Makes discovery possible. First action after user lands.
5. **Replace all dead CTAs** — Any button that leads nowhere costs trust. Replace "Get Early Access" with a working waitlist email capture or remove it.
