# Loop Beta Readiness Report
**Date:** 2026-06-07  
**Operator:** LILCKY STUDIO LIMITED  
**Scope:** Full RALD/Loop ecosystem audit for beta launch readiness

---

## Beta Definition

Beta is the state where a small group of real users can experience the core Loop value proposition — **live audio conversations in African languages** — without needing technical guidance, and are likely to return the next day.

**Not beta:** A working API with no frontend.  
**Not beta:** A frontend with no working audio.  
**Beta:** Two people in a room, speaking, hearing each other, knowing where to go tomorrow.

---

## Current Readiness: NOT BETA-READY

| Dimension | Status | Blocker |
|-----------|--------|---------|
| Audio backend | ⚠️ Partial | Provider secrets unverified, no GET /rooms |
| Audio client | ❌ Missing | No client app in loop-core |
| User auth | ⚠️ Partial | auth.rald.cloud exists, profiles.rald.cloud missing |
| Room discovery | ❌ Missing | No GET /rooms, no browse UI |
| User profiles | ❌ Missing | No profile UI |
| First-time experience | ❌ Missing | No onboarding flow |
| Return mechanism | ❌ Missing | No notifications, follows, or schedule |
| Dead-end elimination | ❌ Pending | Multiple broken external links |

**Estimated delta to beta:** 2–3 focused weeks of frontend work, given the backend is largely in place.

---

## Founder Test Plan

### Test Configuration

| Test | Users | Location | Goal |
|------|-------|----------|------|
| Test 1 | 2 users | Same household | Prove audio works end-to-end |
| Test 2 | 5 users | Same household | Prove multi-participant holds |
| Test 3 | 10 users | Same household | Prove 10-person room quality |
| Test 4 | 5 users | Same region | Prove regional discovery works |
| Test 5 | 10 users | Same region | Prove regional trust and identity reads |

---

### Test 1: 2 Users — Same Household

**Purpose:** Audio works. Two people can talk.

**Setup:**
- 2 devices (phone + laptop or 2 phones)
- Same WiFi network
- Both using `loop.rald.cloud` or test build

**Script:**
1. User A opens Loop, creates a room titled "Test Room - [date]"
2. User A selects language: Yoruba / English / Pidgin
3. User B opens Loop, sees Test Room in the room browser
4. User B joins as listener
5. User A speaks: "Can you hear me?"
6. User B types (or speaks if granted): "Yes"
7. User A grants User B speaker access
8. Both speak. Both hear.
9. User A ends the room.

**Pass criteria:**
- [ ] Room creation takes < 10 seconds
- [ ] Room appears in browser within 5 seconds of creation
- [ ] User B joins within 3 taps
- [ ] Audio latency < 500ms
- [ ] No audio dropout in 5-minute conversation
- [ ] Room ends cleanly, both users see end state

**Failure modes to watch for:**
- 503 on `/rooms` → provider secrets not set
- 401 on join → JWT secret missing or auth.rald.cloud unreachable
- Room created but no audio → client not connecting to LiveKit serverUrl
- Audio one-way only → track publish or subscribe failing

---

### Test 2: 5 Users — Same Household

**Purpose:** Multi-participant doesn't crash. Speaker management works.

**Setup:** 5 devices, same WiFi

**Script:**
1. Host creates room, invites 4 participants via share link
2. All 4 join as listeners
3. Host speaks to confirm audio
4. Host grants speaker to User 2 → User 2 speaks
5. Host grants speaker to Users 3 and 4 simultaneously
6. 3 speakers active at once. Check audio quality.
7. Host mutes User 3
8. User 5 requests to speak (raise hand)
9. Host grants User 5 speaker access
10. Room ends, host and 4 listeners see end state

**Pass criteria:**
- [ ] All 5 users in room within 2 minutes
- [ ] Speaker count shows correctly for all participants
- [ ] 3 simultaneous speakers without audio chaos
- [ ] Mute visible to all participants
- [ ] Raise hand / request-to-speak works
- [ ] Room end visible to all 5 simultaneously

**Failure modes to watch for:**
- Participant count incorrect (state sync issue)
- Audio echoes with multiple speakers (no echo cancellation)
- One participant's audio cuts others (bandwidth management)

---

### Test 3: 10 Users — Same Household

**Purpose:** Platform holds at minimum viable scale. First trust signal.

**Setup:** 10 devices, same WiFi (or mobile hotspot simulation for 5)

**Script:**
1. Host creates room: "10-person test — [language]"
2. All 9 join as listeners
3. Host speaks: verify all 9 hear
4. Host grants 3 speakers sequentially
5. Run for 15 minutes continuous
6. Check: audio quality, participant list accuracy, memory/CPU on devices
7. Host records the session
8. Room ends

**Pass criteria:**
- [ ] All 10 users maintain connection for 15 minutes
- [ ] Participant list accurate throughout
- [ ] Recording starts without error
- [ ] No device overheats or crashes
- [ ] P95 audio latency < 800ms on mobile data simulation

**Metrics to capture:**
- Provider used (RealtimeKit / LiveKit / Tencent) — check audit log
- Failover events (if any)
- Room create → all-joined time
- Any 4xx/5xx responses in realtime service logs

---

### Test 4: 5 Users — Same Region

**Purpose:** Regional discovery and identity work. Users find each other without prior coordination.

**Setup:** 5 users in same city, different networks (4G/5G, not same WiFi)

**Script:**
1. No prior coordination — users open Loop independently
2. Each user sets their region (Lagos / Abuja / PH / etc.) during onboarding
3. Each user sees the room browser filtered to their region
4. User A creates "Lagos Tech Talk" room
5. Users B, C, D, E see it in regional discovery within 30 seconds
6. All join. Run for 10 minutes.
7. After room: each user views host's profile
8. Each user follows the host
9. Host sets a "next room" time

**Pass criteria:**
- [ ] Region set during onboarding (< 3 taps)
- [ ] Regional room filter works
- [ ] Room visible in discovery within 30 seconds of creation
- [ ] Joining from different networks (4G vs WiFi) works
- [ ] Profile visible after room with: name, region, RALD ID, rooms hosted count
- [ ] Follow action works and persists
- [ ] "Next room" schedule visible on profile

**Regional infrastructure check:**
- [ ] `realtime.rald.cloud` latency < 200ms from Nigerian mobile IPs
- [ ] Audio quality maintained on 3G throttled connection (test 1 user on throttle)

---

### Test 5: 10 Users — Same Region

**Purpose:** Trust is understood. Regional belonging is felt. Users would return.

**Setup:** 10 users, same region, different networks, at least 3 on mobile data

**Script:**
1. Host is a recognisable regional persona (e.g. known Twitter/X user in Lagos tech)
2. Host creates room: topic relevant to region
3. Discovery: all 9 users find room via regional browse — no share link
4. Room runs 30 minutes
5. Speakers identified by name and region badge
6. After room: trust badges visible on participant profiles
7. Host announces next room in-app
8. Post-test survey: 24-hour return intent

**Pass criteria:**
- [ ] All 10 users found room without being sent a link
- [ ] Speaker names and regions visible during room
- [ ] Trust level/badge visible on profile (if implemented)
- [ ] Host's "next room" announcement received by all followers within 2 minutes
- [ ] > 7/10 users state they would return tomorrow (survey)
- [ ] > 5/10 users complete their profile during or after the session

---

## Metrics to Measure Across All Tests

### Onboarding completion
- Define: user has set name, region, and joined at least one room
- Target: > 80% of test participants complete onboarding
- Measure: check auth user records for profile field completion rate

### First room join
- Define: time from account creation to first successful room join
- Target: < 3 minutes
- Measure: diff between `user_created` and first `room_joined` audit log entry

### First community join
- Define: user joins a community or follows a host after a room
- Target: > 60% of participants perform this action
- Measure: follow/community join event count post-room

### Profile completion
- Define: name + region + avatar (or RALD ID visible)
- Target: > 50% complete by end of session
- Measure: profile fields populated in auth records

### Trust understanding
- Define: user can explain (in 1 sentence) what a RALD ID is and what it means for trust
- Target: > 6/10 users explain correctly (post-test interview, 30 seconds each)
- Measure: qualitative — brief exit interview

### Next-day return intent
- Define: user states they intend to open Loop tomorrow (survey, scale 1–5)
- Target: > 3.5/5 average
- Measure: post-test SMS/WhatsApp survey (1 question)

---

## Beta Launch Blockers (Must Fix Before Any External User)

| # | Blocker | Owner | Estimated fix |
|---|---------|-------|---------------|
| 1 | `loop.rald.cloud` — no client app exists | Frontend | 2–3 weeks |
| 2 | Provider secrets — unverified in production | DevOps | 1 hour |
| 3 | `GET /rooms` endpoint missing | Backend | 2 hours |
| 4 | `profiles.rald.cloud` — no app | Frontend | 1 week |
| 5 | Audio client (LiveKit JS/RN SDK) — not integrated | Frontend | 3–5 days |
| 6 | Onboarding flow — doesn't exist | Frontend | 3 days |

---

## Beta Launch Conditional Greenlights (Can Ship Without)

| Feature | Why it can wait |
|---------|-----------------|
| Room recording | Nice-to-have; doesn't block core conversation |
| Community channels | Phase 2; follow + notify is enough for V1 return |
| Loop Messenger (messaging) | Audio is the core; messenger is additive |
| Regional analytics | Backend exists (raldtics); frontend is deferred |
| Trust badges | RALD ID is sufficient trust signal for V1 |
| DMs / direct messaging | Audio rooms serve the connection use case first |

---

## Beta-Readiness Timeline

| Week | Work | Milestone |
|------|------|-----------|
| Week 1 | Verify secrets, add GET /rooms, minimal room browser at loop.rald.cloud | Backend confirmed live |
| Week 2 | LiveKit client integration, mic permission, join + speak + listen | 2-user audio works |
| Week 3 | Speaker grid UI, participant list, room end state, basic profile | 5-user test passable |
| Week 4 | Onboarding, region selection, regional discovery, follow | 10-user regional test passable |
| **Week 4 end** | **Run all 5 founder tests** | **Beta decision point** |

---

## Success Criteria for Beta Sign-Off

A first-time user, with no instructions, can:

- [ ] **Understand Loop** — within 30 seconds of landing: "This is live audio rooms for Africa"
- [ ] **Find activity** — within 60 seconds: sees at least 1 room in their region
- [ ] **Join activity** — within 90 seconds: is inside a room hearing audio
- [ ] **Contribute** — within 5 minutes: has spoken or sent a reaction
- [ ] **Understand trust** — within 5 minutes: can see the host's RALD ID and region
- [ ] **Understand their region** — within 5 minutes: knows their region is shown on their profile

All 6 must pass for 4 out of 5 test participants in the same-region 5-user test.

---

*Prepared by Replit Agent for LILCKY STUDIO LIMITED · Loop V1 Must Feel Alive Sprint · 2026-06-07*
