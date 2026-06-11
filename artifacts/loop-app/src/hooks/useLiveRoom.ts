import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  LocalTrack,
  RemoteParticipant,
  LocalParticipant,
  createLocalAudioTrack,
  ConnectionState,
} from "livekit-client";
import { joinRoom, leaveRoom } from "../lib/api";

export type RoomRole = "host" | "speaker" | "listener";

export interface LiveParticipant {
  identity: string;
  displayName: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
  role: RoomRole;
}

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  ts: number;
  isLocal: boolean;
}

interface ChatPayload {
  type: "chat";
  id: string;
  from: string;
  text: string;
  ts: number;
}

export interface LiveRoomState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  participants: LiveParticipant[];
  isMuted: boolean;
  myRole: RoomRole;
  canSpeak: boolean;
  speakerCount: number;
  listenerCount: number;
  pttMode: boolean;
  isPTTActive: boolean;
  messages: ChatMessage[];
  unreadCount: number;
}

const CHAT_TOPIC = "loop-chat";

export function useLiveRoom(roomId: string | null, displayName: string, role: RoomRole = "listener") {
  const roomRef              = useRef<Room | null>(null);
  const localAudioRef        = useRef<LocalTrack | null>(null);
  const pttActiveRef         = useRef(false);
  const chatOpenRef          = useRef(false); // set by LiveRoom when panel is open
  const intentionalDisconRef = useRef(false); // true when user explicitly leaves
  const reconnectTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const [state, setState] = useState<LiveRoomState>({
    connected: false,
    connecting: false,
    error: null,
    participants: [],
    isMuted: role !== "listener",
    myRole: role,
    canSpeak: role !== "listener",
    speakerCount: 0,
    listenerCount: 0,
    pttMode: role !== "listener",
    isPTTActive: false,
    messages: [],
    unreadCount: 0,
  });

  // ── Participants ──────────────────────────────────────────────────────── //

  const updateParticipants = useCallback((room: Room) => {
    const local   = room.localParticipant;
    const remotes = Array.from(room.remoteParticipants.values());

    const toParticipant = (
      p: LocalParticipant | RemoteParticipant,
      isLocal: boolean
    ): LiveParticipant => {
      const name       = p.name ?? p.identity;
      const audioTrack = isLocal
        ? Array.from((p as LocalParticipant).audioTrackPublications.values())[0]
        : Array.from((p as RemoteParticipant).audioTrackPublications.values())[0];
      const isMuted    = audioTrack?.isMuted ?? true;
      const canPublish = isLocal
        ? (p as LocalParticipant).permissions?.canPublish ?? false
        : true;
      return {
        identity: p.identity,
        displayName: name,
        isSpeaking: p.isSpeaking,
        isMuted,
        isLocal,
        role: canPublish ? "speaker" : "listener",
      };
    };

    const all: LiveParticipant[] = [
      toParticipant(local, true),
      ...remotes.map((r) => toParticipant(r, false)),
    ];

    const speakerCount  = all.filter((p) => !p.isMuted && p.role !== "listener").length;
    const listenerCount = all.filter((p) => p.role === "listener").length;

    setState((prev) => ({ ...prev, participants: all, speakerCount, listenerCount }));
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────── //

  const connect = useCallback(async () => {
    if (!roomId) return;
    intentionalDisconRef.current = false;
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    setState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      const joinResult = await joinRoom(roomId, role);
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      roomRef.current = room;

      // Participant events
      room.on(RoomEvent.ParticipantConnected,    () => updateParticipants(room));
      room.on(RoomEvent.ParticipantDisconnected, () => updateParticipants(room));
      room.on(RoomEvent.TrackPublished,          () => updateParticipants(room));
      room.on(RoomEvent.TrackUnpublished,        () => updateParticipants(room));
      room.on(RoomEvent.TrackMuted,              () => updateParticipants(room));
      room.on(RoomEvent.TrackUnmuted,            () => updateParticipants(room));
      room.on(RoomEvent.ActiveSpeakersChanged,   () => updateParticipants(room));

      // Connection events
      room.on(RoomEvent.ConnectionStateChanged, (cs) => {
        if (cs === ConnectionState.Disconnected)
          setState((prev) => ({ ...prev, connected: false, connecting: false }));
      });
      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null;
        setState((prev) => ({
          ...prev, connected: false, connecting: false, participants: [], isPTTActive: false,
        }));

        // Phase 4: Auto-reconnect on unexpected network drop (not user-initiated)
        if (!intentionalDisconRef.current && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30_000);
          reconnectAttemptsRef.current += 1;
          setState((prev) => ({ ...prev, error: `Connection lost. Reconnecting in ${Math.round(delay / 1000)}s… (${reconnectAttemptsRef.current}/5)` }));
          reconnectTimerRef.current = setTimeout(() => {
            reconnectAttemptsRef.current > 0 && connect();
          }, delay);
        }
      });

      // Chat — DataReceived
      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const raw = new TextDecoder().decode(payload);
          const msg = JSON.parse(raw) as ChatPayload;
          if (msg.type !== "chat") return;

          const incoming: ChatMessage = {
            id:      msg.id,
            from:    msg.from,
            text:    msg.text,
            ts:      msg.ts,
            isLocal: false,
          };

          setState((prev) => ({
            ...prev,
            messages:    [...prev.messages, incoming],
            unreadCount: chatOpenRef.current ? 0 : prev.unreadCount + 1,
          }));
        } catch { /* malformed payload — ignore */ }
      });

      await room.connect(joinResult.serverUrl, joinResult.token, { autoSubscribe: true });

      if (role === "host" || role === "speaker") {
        const audioTrack = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
        localAudioRef.current = audioTrack;
        await room.localParticipant.publishTrack(audioTrack);
        await audioTrack.mute(); // PTT default
      }

      updateParticipants(room);
      reconnectAttemptsRef.current = 0; // reset on successful connect
      setState((prev) => ({
        ...prev,
        connected:   true,
        connecting:  false,
        error:       null,
        myRole:      role,
        canSpeak:    role !== "listener",
        isMuted:     role !== "listener",
        pttMode:     role !== "listener",
        isPTTActive: false,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      setState((prev) => ({ ...prev, connecting: false, error: msg }));
      // Auto-retry on initial connection failure too
      if (!intentionalDisconRef.current && reconnectAttemptsRef.current < 5) {
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30_000);
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => connect(), delay);
      }
    }
  }, [roomId, role, displayName, updateParticipants]);

  // ── Disconnect ────────────────────────────────────────────────────────── //

  const disconnect = useCallback(async () => {
    intentionalDisconRef.current = true;
    reconnectAttemptsRef.current = 0;
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    if (roomRef.current) { await roomRef.current.disconnect(); roomRef.current = null; }
    if (localAudioRef.current) { localAudioRef.current.stop(); localAudioRef.current = null; }
    if (roomId) { try { await leaveRoom(roomId); } catch { /* non-fatal */ } }
    pttActiveRef.current = false;
    setState((prev) => ({ ...prev, connected: false, connecting: false, participants: [], isPTTActive: false }));
  }, [roomId]);

  // ── Chat ──────────────────────────────────────────────────────────────── //

  const sendMessage = useCallback(async (text: string) => {
    const room = roomRef.current;
    if (!room || !text.trim()) return;

    const payload: ChatPayload = {
      type: "chat",
      id:   `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      from: displayName,
      text: text.trim(),
      ts:   Date.now(),
    };

    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    await room.localParticipant.publishData(bytes, { reliable: true, topic: CHAT_TOPIC });

    const local: ChatMessage = { ...payload, isLocal: true };
    setState((prev) => ({ ...prev, messages: [...prev.messages, local] }));
  }, [displayName]);

  /** Call when the chat panel opens so new messages don't increment the badge */
  const markChatRead = useCallback(() => {
    chatOpenRef.current = true;
    setState((prev) => ({ ...prev, unreadCount: 0 }));
  }, []);

  /** Call when the chat panel closes */
  const markChatClosed = useCallback(() => {
    chatOpenRef.current = false;
  }, []);

  // ── PTT ───────────────────────────────────────────────────────────────── //

  const startPTT = useCallback(async () => {
    if (pttActiveRef.current) return;
    pttActiveRef.current = true;
    setState((prev) => ({ ...prev, isPTTActive: true }));
    const room = roomRef.current;
    if (!room) return;
    const local = room.localParticipant;
    const pub   = Array.from(local.audioTrackPublications.values())[0];
    if (!pub) {
      try {
        const track = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
        localAudioRef.current = track;
        await local.publishTrack(track);
        setState((prev) => ({ ...prev, canSpeak: true, isMuted: false }));
        updateParticipants(room);
      } catch {
        pttActiveRef.current = false;
        setState((prev) => ({ ...prev, isPTTActive: false }));
      }
      return;
    }
    if (pub.isMuted) { await pub.unmute(); setState((prev) => ({ ...prev, isMuted: false })); updateParticipants(room); }
  }, [updateParticipants]);

  const endPTT = useCallback(async () => {
    if (!pttActiveRef.current) return;
    pttActiveRef.current = false;
    setState((prev) => ({ ...prev, isPTTActive: false }));
    const room = roomRef.current;
    if (!room) return;
    const pub = Array.from(room.localParticipant.audioTrackPublications.values())[0];
    if (pub && !pub.isMuted) { await pub.mute(); setState((prev) => ({ ...prev, isMuted: true })); updateParticipants(room); }
  }, [updateParticipants]);

  // ── Open-mic toggle ───────────────────────────────────────────────────── //

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const local = room.localParticipant;
    const pub   = Array.from(local.audioTrackPublications.values())[0];
    if (!pub) {
      if (role !== "listener") {
        try {
          const track = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
          localAudioRef.current = track;
          await local.publishTrack(track);
          setState((prev) => ({ ...prev, isMuted: false, canSpeak: true }));
        } catch { /* denied */ }
      }
      return;
    }
    if (pub.isMuted) { await pub.unmute(); setState((prev) => ({ ...prev, isMuted: false })); }
    else             { await pub.mute();   setState((prev) => ({ ...prev, isMuted: true  })); }
    updateParticipants(room);
  }, [role, updateParticipants]);

  const togglePttMode = useCallback(async () => {
    setState((prev) => {
      const nextPtt = !prev.pttMode;
      const room    = roomRef.current;
      if (room) {
        const pub = Array.from(room.localParticipant.audioTrackPublications.values())[0];
        if (!nextPtt && pub?.isMuted) {
          pub.unmute().then(() => { setState((s) => ({ ...s, isMuted: false })); updateParticipants(room); });
        }
        if (nextPtt && pub && !pub.isMuted) {
          pub.mute().then(() => { setState((s) => ({ ...s, isMuted: true })); updateParticipants(room); });
        }
      }
      return { ...prev, pttMode: nextPtt, isPTTActive: false };
    });
  }, [updateParticipants]);

  const requestToSpeak = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const track = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
      localAudioRef.current = track;
      await room.localParticipant.publishTrack(track);
      setState((prev) => ({ ...prev, canSpeak: true, myRole: "speaker", isMuted: false, pttMode: true, isPTTActive: false }));
      updateParticipants(room);
    } catch (err) {
      setState((prev) => ({ ...prev, error: err instanceof Error ? err.message : "Mic access denied" }));
    }
  }, [updateParticipants]);

  // ── Cleanup ───────────────────────────────────────────────────────────── //

  useEffect(() => {
    return () => {
      if (roomRef.current)    roomRef.current.disconnect();
      if (localAudioRef.current) localAudioRef.current.stop();
    };
  }, []);

  return {
    state,
    connect, disconnect,
    toggleMute, startPTT, endPTT, togglePttMode, requestToSpeak,
    sendMessage, markChatRead, markChatClosed,
  };
}
