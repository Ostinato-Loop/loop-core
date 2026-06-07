# Loop — User Return Analysis
**Date:** 2026-06-07  
**Question:** Why would a user return tomorrow?

---

## The Core Problem

**A user has no reason to return because there is nothing to return to.**

Return is driven by one of three things:
1. **Content** — something new happened while I was gone
2. **Connection** — someone is waiting for me, or I am waiting for them
3. **Completion** — I started something I haven't finished

Loop V1, as audited, provides none of these.

---

## What Drives Return in Social Audio Platforms

Based on the mechanics of platforms like Clubhouse, Twitter Spaces, and Discord Stage Channels:

| Return Driver | Mechanism | Loop V1 status |
|---------------|-----------|----------------|
| Room notifications | "Your friend just started a room" | No notification system wired to Loop |
| Community schedule | "Lagos Tech Founders meets Thursdays 8pm" | No community or schedule concept |
| Follow system | "3 people you follow are live" | No follow graph |
| Content residue | "You missed a 2-hour conversation on Afrobeats" | No recordings surfaced |
| Regional pull | "5 rooms active in your city" | No regional filter |
| Social proof | "247 people listened to this yesterday" | No listen counts visible |
| Unfinished identity | "Complete your profile to unlock trust badge" | No profile completion flow |

---

## User Journey Analysis (First Session → Return)

### Scenario A: User discovers `loop.rald.cloud` (if live)

```
Land → [unknown state — no repo found]
```
**Return probability: 0%** — can't return to a surface that may not exist.

### Scenario B: User discovers Loop via Products page (`rald.cloud`)

```
rald.cloud → sees "Loop" card → clicks → https://loop.rald.cloud → [unknown]
```
If `loop.rald.cloud` shows a room browser:
```
Room browser → finds a room → joins → hears audio → conversation ends → leaves
```
**Return probability: ~15%** — only if the conversation was compelling and they remember the URL.

Without a notification, follow, or community hook: **no mechanism to pull them back.**

### Scenario C: Ideal first session (what V1 should deliver)

```
Land → see live rooms in my region → join room → speak → follow 2 people →
get "rooms starting soon" notification → return next day
```
**Return probability: 60–70%** — this is how audio social works.

**Gap:** Steps 1, 3 (join), 5 (follow), and 6 (notification) are all missing from reviewed code.

---

## Return Blockers by Layer

### Psychological blockers
- **No identity investment** — User has no profile to protect or grow. Nothing ties them to Loop specifically.
- **No social graph** — No follows, no friends list, no community membership. The product has no memory of who you know.
- **No progress** — No reputation, no trust level progression, no "you've hosted 3 rooms" moment.

### Technical blockers
- **No push notifications** — `rald-notify` repo (75KB) exists with SMS, email, and push channels, but no integration point to Loop room events found.
- **No room scheduling** — No way to announce "I'm hosting tomorrow at 8pm." No calendar, no RSVP.
- **No persistent threads** — Conversations vanish when the room closes. No way to continue the discussion.
- **No follow/subscribe** — No API endpoint for "follow user" or "subscribe to community" found in any reviewed repo.

### Discovery blockers
- **No feed** — There is no "what happened while you were gone" surface.
- **No trending** — No signal about what's popular, who's active, what's growing.
- **No regional context** — The BRAND.md mentions "Yoruba, Igbo, Hausa, Swahili" — none of this is surfaced in UI.

---

## What Must Be True for Next-Day Return

Rank ordered by implementation cost vs impact:

### Tier 1: Low cost, high impact (must ship first)
| Action | What it unlocks | Implementation cost |
|--------|-----------------|---------------------|
| Active rooms list with participant counts | "Something is happening" signal | 1 API endpoint + UI |
| Room ended → "conversation summary" screen | Gives user something to share | Frontend only |
| "Join as listener" with zero friction | Lowers commitment to try | Already in API, needs client |

### Tier 2: Medium cost, high return (ship in sprint)
| Action | What it unlocks | Implementation cost |
|--------|-----------------|---------------------|
| User profile with RALD ID | Identity investment | Profile API exists, needs UI |
| Follow a host after a room | Social graph seed | New API endpoint |
| Email/SMS notification when followed host goes live | Pull-back mechanism | rald-notify exists, needs event hook |

### Tier 3: High cost, essential (next sprint)
| Action | What it unlocks | Implementation cost |
|--------|-----------------|---------------------|
| Community / topic channels | Recurring attendance | New data model |
| Room scheduling | Pre-commitment | New API + calendar UI |
| Regional room filtering | "My city is active" | Region field on rooms |

---

## Retention Benchmarks (African Social Audio Context)

| Metric | Cold product | Warm product | Target for Loop V1 |
|--------|-------------|--------------|-------------------|
| D1 retention | <5% | 25–40% | >20% |
| D7 retention | <1% | 10–20% | >10% |
| Session length | <2 min | 15–45 min | >20 min |
| Rooms joined per session | 0.1 | 2–3 | 1.5 |
| Profile completion | <10% | 40–60% | >30% |

**Current Loop V1 trajectory:** D1 retention near 0% until `loop.rald.cloud` is live with rooms.

---

## The Single Change With the Highest Return Impact

**Add one notification.**

When a user leaves a room, show: *"Host X is going live again tomorrow at 8pm. Want a reminder?"*

One SMS via Termii (already integrated in `rald-notify`) converts a one-time visitor into a scheduled returner.  
Cost: 1 endpoint + 1 UI prompt + 1 Termii SMS.  
This is the cheapest, highest-impact retention mechanism available given existing infrastructure.
