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
  metadata?: Record<string, string>;
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
  email: string;
  raldId: string;
  displayName?: string;
  region?: string;
}

function getToken(): string | null {
  return localStorage.getItem("loop_jwt");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export async function guestRegister(displayName: string): Promise<{ token: string; user: AuthUser }> {
  const email = `guest_${Math.random().toString(36).substring(2, 10)}@loop.guest`;
  const password = Math.random().toString(36).substring(2, 18);
  const res = await fetch(`${AUTH_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!res.ok) throw new Error(`Auth register failed: ${res.status}`);
  const data = await res.json() as { token: string; user: AuthUser };
  localStorage.setItem("loop_jwt", data.token);
  localStorage.setItem("loop_user", JSON.stringify({ ...data.user, displayName }));
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${AUTH_URL}/auth/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json() as Promise<AuthUser>;
}

export async function listRooms(region?: string): Promise<LoopRoom[]> {
  const url = new URL(`${REALTIME_URL}/rooms`);
  if (region && region !== "all") url.searchParams.set("region", region);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`List rooms failed: ${res.status}`);
  const data = await res.json() as { rooms: LoopRoom[] };
  return data.rooms ?? [];
}

export async function createRoom(opts: {
  roomId: string;
  name: string;
  description: string;
  category: string;
  region: string;
  language: string;
  maxParticipants?: number;
}): Promise<{ roomId: string; provider: string }> {
  const res = await fetch(`${REALTIME_URL}/rooms`, {
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
      },
    }),
  });
  if (!res.ok) throw new Error(`Create room failed: ${res.status}`);
  return res.json() as Promise<{ roomId: string; provider: string }>;
}

export async function joinRoom(roomId: string, role: "host" | "speaker" | "listener" = "listener"): Promise<JoinResult> {
  const res = await fetch(`${REALTIME_URL}/rooms/${encodeURIComponent(roomId)}/join`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ product: "loop", role }),
  });
  if (!res.ok) throw new Error(`Join room failed: ${res.status}`);
  return res.json() as Promise<JoinResult>;
}

export async function leaveRoom(roomId: string): Promise<void> {
  await fetch(`${REALTIME_URL}/rooms/${encodeURIComponent(roomId)}/leave`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ product: "loop" }),
  });
}

export async function getParticipants(roomId: string): Promise<Array<{ userId: string; role: string; audioEnabled: boolean }>> {
  const res = await fetch(`${REALTIME_URL}/rooms/${encodeURIComponent(roomId)}/participants`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json() as { participants: Array<{ userId: string; role: string; audioEnabled: boolean }> };
  return data.participants ?? [];
}
