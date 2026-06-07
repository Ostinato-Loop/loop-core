# Loop — Dead End Elimination
**Date:** 2026-06-07  
**Scope:** All dead routes, dead CTAs, dead screens, dead interactions across the Loop/RALD ecosystem

---

## Classification

| Severity | Definition |
|----------|-----------|
| 🔴 CRITICAL | User action leads to 404, blank page, or broken external URL |
| 🟠 HIGH | User action leads to a page that does nothing (dead button, no form) |
| 🟡 MEDIUM | User action leads to placeholder content with no clear next step |
| 🟢 DEFERRED | Known gap, acceptable for V1 if clearly communicated |

---

## 1. Dead External Links

These URLs are referenced in source code and would be clicked by real users. No repository in the Ostinato-Loop org backs them.

| URL | Where referenced | Severity | Action |
|-----|-----------------|----------|--------|
| `https://loop.rald.cloud` | Products page — primary Loop card | 🔴 CRITICAL | Deploy or redirect to waitlist |
| `https://messenger.rald.cloud` | Products page — Loop Messenger card | 🔴 CRITICAL | Deploy or redirect to waitlist |
| `https://profiles.rald.cloud` | RALD Identity landing — "Sign In" nav CTA | 🔴 CRITICAL | Deploy profile app or redirect to `auth.rald.cloud` |
| `https://profile.rald.cloud` | RALD Identity landing — footer link | 🔴 CRITICAL | Consolidate with `profiles.rald.cloud` or remove |

**Recommendation:** If the domain cannot be deployed this sprint, replace the link with a `/waitlist?product=loop` route and capture the email. Never leave a clicked card going to a blank page.

---

## 2. Dead CTAs (Buttons That Do Nothing)

### Products page (`rald.cloud`)
| CTA | Current behaviour | Severity | Fix |
|-----|------------------|----------|-----|
| "Join with a Referral Code" | Routes to `/referral` | 🟡 MEDIUM | Verify referral flow completes end-to-end |
| "Loop" product card | Opens `https://loop.rald.cloud` | 🔴 CRITICAL | See above |
| "Loop Messenger" card | Opens `https://messenger.rald.cloud` | 🔴 CRITICAL | See above |
| AI Agents "all systems nominal" badge | Static HTML, not live | 🟡 MEDIUM | Pull from `/health/providers` or hide |

### Loop Business landing (`/loop`)
| CTA | Current behaviour | Severity | Fix |
|-----|------------------|----------|-----|
| "Ready to sell smarter?" | No form, no redirect, no action | 🟠 HIGH | Add email capture or redirect to `/referral` |
| Feature list icons (🏪📦💳🚚📊🌍) | Decorative only | 🟢 DEFERRED | OK for V1 |

### Loop Messenger landing (`/messenger`)
| CTA | Current behaviour | Severity | Fix |
|-----|------------------|----------|-----|
| "Get Early Access to Loop Messenger" | No form, no redirect, no action | 🟠 HIGH | Capture email or route to `/referral` |
| All 6 feature descriptions | Marketing copy, no links | 🟢 DEFERRED | OK for V1 |

### Loop Voice landing (`/voice`)
| CTA | Current behaviour | Severity | Fix |
|-----|------------------|----------|-----|
| "Give your app a voice." | No form, no redirect | 🟠 HIGH | Link to docs or capture developer interest |
| "SIP Trunking", "Local Numbers" etc. | No pricing, no sign-up | 🟢 DEFERRED | OK for V1 |

### RALD Identity landing (`/identity`)
| CTA | Current behaviour | Severity | Fix |
|-----|------------------|----------|-----|
| "Quick Start →" (hero) | Anchors to `#quickstart` on same page | 🟢 OK | Works correctly |
| "API Reference" | Anchors to `#api` on same page | 🟢 OK | Works correctly |
| `npm install @rald/auth-sdk` copy button | Copies text — SDK may not be published | 🟠 HIGH | Verify `@rald/auth-sdk` is on npm or mark as "coming soon" |
| "Sign In" nav | Opens `https://profiles.rald.cloud` | 🔴 CRITICAL | See above |

### Loop Dispatch landing (`/dispatch`)
| CTA | Status | Severity |
|-----|--------|----------|
| Not reviewed — landing content not retrieved | Assumed similar pattern | 🟡 MEDIUM |

---

## 3. Dead Repositories (Described Products With No Code)

These repos are 3KB stubs: `README.md` + `BRAND.md` only. Marketing describes them as functional products.

| Repository | Described as | Reality | Action |
|------------|-------------|---------|--------|
| `loop-core` | "Loop Business core platform" | Empty | Add note in README: "In development" |
| `loop-admin` | "Loop Business admin dashboard" | Empty | Same |
| `loop-business` | "Storefront & merchant platform" | Empty | Same |
| `loop-domains` | "Hosted domains & email" | Empty | Same |
| `loop-storefronts` | "Hosted storefronts" | Empty | Same |
| `loop-logistics` | "Logistics & shipping" | Empty | Same |
| `loop-meta-cloud` | "Meta Cloud infrastructure" | Empty | Same |
| `loop-dispatch` | "Nigerian last-mile delivery aggregator" | Empty | Same |
| `loop-voice` | "SIP & communications gateway" | Empty | Note: actual SIP work lives in `rald-realtime` |
| `payrald-core` + 7 payrald-* repos | "Payment engine, wallet, cards..." | Empty | Same |
| `gitrald-*` (8 repos) | "CI/CD orchestration" | Empty | Same |
| `rald-sdk-*` (6 repos) | "React, Next.js, RN, Auth SDKs" | Empty | Same |

**The danger:** A developer or investor cloning these repos discovers the ecosystem is mostly vaporware. Set honest README status badges.

---

## 4. Auth-Gated Dead Ends

All `/control/*` routes require successful authentication. If `auth.rald.cloud` is misconfigured or the Clerk bridge is broken, the entire control surface is dead.

| Route | Gate | Risk |
|-------|------|------|
| `/control` (EcosystemOverview) | AuthGate | 🔴 If auth fails, blank |
| `/control/hub` (ControlHub) | AuthGate | 🔴 Same |
| `/control/repos` | AuthGate | 🔴 Same |
| `/control/deployments` | AuthGate | 🔴 Same |
| `/control/payments` | AuthGate | 🔴 Same |
| `/control/logistics` | AuthGate | 🔴 Same |
| `/control/secrets` | AuthGate | 🔴 Same |
| `/control/expansion` | AuthGate | 🔴 Same |
| `/control/agents` | AuthGate | 🔴 Same |

**Action:** Verify auth flow end-to-end. `POST /auth/login` → JWT → `GET /auth/me` → `/control` loads. If any step fails, add a visible error state in `AuthGate.tsx` instead of silent blank.

---

## 5. Dead Interactions (UI Elements With No Functional Effect)

| Element | Location | Severity | Fix |
|---------|----------|----------|-----|
| Agent status badges ("active", "idle") | Products page | 🟡 MEDIUM | Wire to real `/health` data or mark static |
| "6 agents active · 0 alerts" counter | Products page | 🟡 MEDIUM | Same |
| All product stat numbers (₦2.4B+, 12,000+, 99.9%) | Loop Business landing | 🟡 MEDIUM | Add "as of [date]" or source — currently unverifiable |
| Participant counts on rooms | Doesn't exist | 🔴 CRITICAL | Must exist before launch |

---

## Elimination Priority Order

**This week (blocks launch):**
1. `loop.rald.cloud` — deploy or redirect
2. `messenger.rald.cloud` — deploy or redirect  
3. `profiles.rald.cloud` — deploy or redirect
4. All "Get Early Access" / "Ready to sell smarter?" CTAs → working email capture

**This sprint (degrades trust):**
5. `@rald/auth-sdk` — verify it is actually published to npm
6. AuthGate — add visible error state for failed auth
7. Agent status section — live data or honest static

**Next sprint (polish):**
8. Stub repos — add `## Status: In Development` to all READMEs
9. Marketing stats — add source/date citations
