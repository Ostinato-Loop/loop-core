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

// Shape returned by auth.rald.cloud /auth/register and /auth/login
interface AuthServerUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  raldId: string;
  displayName?: string;
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

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function guestRegister(
  displayName: string
): Promise<{ token: string; user: AuthUser }> {
  const email = `guest_${Math.random().toString(36).substring(2, 10)}@loop.guest`;
  const password = Math.random().toString(36).substring(2, 18);

  // Auth server validates 'name', not 'displayName'
  const res = await fetch(`${AUTH_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: displayName }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Auth register failed: ${res.status} ${detail}`);
  }

  const data = (await res.json()) as { token: string; user: AuthServerUser };

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email,
    raldId: data.user.id,           // auth server uses 'id'; alias as raldId
    displayName: displayName,       // use the display name the user typed
  };

  localStorage.setItem("loop_jwt", data.token);
  localStorage.setItem("loop_user", JSON.stringify(user));
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
  role: "host" | "speaker" | "listener" = "listener"
): Promise<JoinResult> {
  const res = await apiFetch(
    `${REALTIME_URL}/rooms/${encodeURIComponent(roomId)}/join`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ product: "loop", role }),
    }
  );
  if (!res.ok) throw new Error(`Join room failed: ${res.status}`);
  return res.json() as Promise<JoinResult>;
}

export async function leaveRoom(roomId: string): Promise<void> {
  // fire-and-forget — never throws, never intercepts auth
  fetch(`${REALTIME_URL}/rooms/${encodeURIComponent(roomId)}/leave`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ product: "loop" }),
  }).catch(() => { /* non-fatal */ });
}

export async function getParticipants(
  roomId: string
): Promise<Array<{ userId: string; role: string; audioEnabled: boolean }>> {
  const res = await apiFetch(
    `${REALTIME_URL}/rooms/${encodeURIComponent(roomId)}/participants?product=loop`,
    { headers: authHeaders() }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    participants: Array<{ userId: string; role: string; audioEnabled: boolean }>;
  };
  return data.participants ?? [];
}
