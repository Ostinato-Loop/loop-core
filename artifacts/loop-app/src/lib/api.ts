import { REALTIME_URL, AUTH_URL } from "./constants";

export interface LoopRoom {
  roomId: string;
  name: string;
  description: string;
  host: string;
  hostId: string;
  category: string;
  region: string;
  language: string;
  participantCount: number;
  maxParticipants: number;
  createdAt: string;
}

export interface JoinResult {
  roomId: string;
  userId: string;
  provider: string;
  token: string;
  serverUrl: string;
  providerRoomId: string;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  name: string;
  raldId: string;
  reservedEmailAddress: string;
  trustLevel: string;
  needsVerification: boolean;
  verificationUrl: string;
  region?: string;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem("loop_jwt");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function handleAuthFailure(): void {
  localStorage.removeItem("loop_jwt");
  localStorage.removeItem("loop_user");
  window.dispatchEvent(new CustomEvent("loop:auth:expired"));
}

async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    handleAuthFailure();
    throw new Error("SESSION_EXPIRED");
  }
  return res;
}

// ── Identity check for live availability ──────────────────────────────────────

export interface UsernameCheckResult {
  available: boolean;
  username:  string;
  reason?:   string;
  reservations?: {
    mail:      string;
    domain:    string;
    workspace: string;
  };
}

export async function checkUsername(username: string): Promise<UsernameCheckResult> {
  const res = await fetch(
    `${AUTH_URL}/username/check/${encodeURIComponent(username.toLowerCase().trim())}`,
    { headers: { "Content-Type": "application/json" } },
  );
  return res.json() as Promise<UsernameCheckResult>;
}

// ── raldClaim — replace guestRegister ────────────────────────────────────────
// Creates a first-class RALD identity via POST /auth/loop-claim.
// Issues a real JWT immediately — no OTP required to enter Loop.
// User's @username is reserved from day one, along with username@rald.me.
// `needsVerification: true` is returned — Loop shows an async verification banner.
export async function raldClaim(
  username: string,
  displayName: string,
  region: string,
): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${AUTH_URL}/auth/loop-claim`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username:     username.toLowerCase().trim(),
      display_name: displayName.trim(),
      region,
    }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(detail.error ?? `Identity claim failed: ${res.status}`);
  }

  const data = await res.json() as {
    ok:    boolean;
    token: string;
    user: {
      id:                     string;
      username:               string;
      display_name:           string;
      name:                   string;
      role:                   string;
      rald_internal_id:       string;
      reserved_email_address: string;
      trust_level:            string;
      needs_verification:     boolean;
      verification_url:       string;
    };
  };

  const user: AuthUser = {
    id:                   data.user.id,
    username:             data.user.username,
    displayName:          displayName.trim(),
    name:                 data.user.name,
    raldId:               data.user.rald_internal_id,
    reservedEmailAddress: data.user.reserved_email_address,
    trustLevel:           data.user.trust_level,
    needsVerification:    data.user.needs_verification,
    verificationUrl:      data.user.verification_url,
    region,
  };

  localStorage.setItem("loop_jwt",  data.token);
  localStorage.setItem("loop_user", JSON.stringify({ ...user, isGuest: false }));
  return { token: data.token, user };
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export async function listRooms(region?: string): Promise<LoopRoom[]> {
  const url = new URL(`${REALTIME_URL}/rooms`);
  url.searchParams.set("product", "loop");
  if (region && region !== "all") url.searchParams.set("region", region);
  const res = await apiFetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`List rooms failed: ${res.status}`);
  const data = (await res.json()) as { rooms: LoopRoom[] };
  return data.rooms ?? [];
}

export async function getRoom(roomId: string): Promise<LoopRoom | null> {
  const url = new URL(`${REALTIME_URL}/rooms/${encodeURIComponent(roomId)}`);
  url.searchParams.set("product", "loop");
  const res = await apiFetch(url.toString(), { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Get room failed: ${res.status}`);
  return res.json() as Promise<LoopRoom>;
}

export async function createRoom(opts: {
  roomId: string;
  name: string;
  description: string;
  category: string;
  region: string;
  language: string;
  host: string;
  maxParticipants?: number;
}): Promise<{ roomId: string; provider: string }> {
  const res = await apiFetch(`${REALTIME_URL}/rooms`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      roomId: opts.roomId,
      product: "loop",
      maxParticipants: opts.maxParticipants ?? 500,
      metadata: {
        name: opts.name,
        description: opts.description,
        category: opts.category,
        region: opts.region,
        language: opts.language,
        host: opts.host,
      },
    }),
  });
  if (!res.ok) throw new Error(`Create room failed: ${res.status}`);
  return res.json() as Promise<{ roomId: string; provider: string }>;
}

export async function joinRoom(
  roomId: string,
  role: "host" | "speaker" | "listener" = "listener",
): Promise<JoinResult> {
  const res = await apiFetch(
    `${REALTIME_URL}/rooms/${encodeURIComponent(roomId)}/join`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ product: "loop", role }),
    },
  );
  if (!res.ok) throw new Error(`Join room failed: ${res.status}`);
  return res.json() as Promise<JoinResult>;
}

export async function leaveRoom(roomId: string): Promise<void> {
  fetch(`${REALTIME_URL}/rooms/${encodeURIComponent(roomId)}/leave`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ product: "loop" }),
  }).catch(() => { /* non-fatal */ });
}

export async function getParticipants(
  roomId: string,
): Promise<Array<{ userId: string; role: string; audioEnabled: boolean }>> {
  const res = await apiFetch(
    `${REALTIME_URL}/rooms/${encodeURIComponent(roomId)}/participants?product=loop`,
    { headers: authHeaders() },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    participants: Array<{ userId: string; role: string; audioEnabled: boolean }>;
  };
  return data.participants ?? [];
}
