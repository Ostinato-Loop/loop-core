import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  LocalTrack,
  RemoteParticipant,
  LocalParticipant,
  Track,
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
}

export function useLiveRoom(roomId: string | null, displayName: string, role: RoomRole = "listener") {
  const roomRef = useRef<Room | null>(null);
  const localAudioRef = useRef<LocalTrack | null>(null);
  const [state, setState] = useState<LiveRoomState>({
    connected: false,
    connecting: false,
    error: null,
    participants: [],
    isMuted: false,
    myRole: role,
    canSpeak: role !== "listener",
    speakerCount: 0,
    listenerCount: 0,
  });

  const updateParticipants = useCallback((room: Room) => {
    const local = room.localParticipant;
    const remotes = Array.from(room.remoteParticipants.values());

    const toParticipant = (p: LocalParticipant | RemoteParticipant, isLocal: boolean): LiveParticipant => {
      const name = p.name ?? p.identity;
      const audioTrack = isLocal
        ? Array.from((p as LocalParticipant).audioTrackPublications.values())[0]
        : Array.from((p as RemoteParticipant).audioTrackPublications.values())[0];
      const isMuted = audioTrack?.isMuted ?? true;
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

    const speakerCount = all.filter((p) => !p.isMuted && p.role !== "listener").length;
    const listenerCount = all.filter((p) => p.role === "listener").length;

    setState((prev) => ({ ...prev, participants: all, speakerCount, listenerCount }));
  }, []);

  const connect = useCallback(async () => {
    if (!roomId) return;
    setState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      const joinResult = await joinRoom(roomId, role);
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, () => updateParticipants(room));
      room.on(RoomEvent.ParticipantDisconnected, () => updateParticipants(room));
      room.on(RoomEvent.TrackPublished, () => updateParticipants(room));
      room.on(RoomEvent.TrackUnpublished, () => updateParticipants(room));
      room.on(RoomEvent.TrackMuted, () => updateParticipants(room));
      room.on(RoomEvent.TrackUnmuted, () => updateParticipants(room));
      room.on(RoomEvent.ActiveSpeakersChanged, () => updateParticipants(room));
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Disconnected) {
          setState((prev) => ({ ...prev, connected: false, connecting: false }));
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        setState((prev) => ({ ...prev, connected: false, connecting: false, participants: [] }));
      });

      await room.connect(joinResult.serverUrl, joinResult.token, { autoSubscribe: true });

      if (role === "host" || role === "speaker") {
        const audioTrack = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
        localAudioRef.current = audioTrack;
        await room.localParticipant.publishTrack(audioTrack);
      }

      updateParticipants(room);
      setState((prev) => ({
        ...prev,
        connected: true,
        connecting: false,
        myRole: role,
        canSpeak: role !== "listener",
        isMuted: role === "listener",
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      setState((prev) => ({ ...prev, connecting: false, error: msg }));
    }
  }, [roomId, role, displayName, updateParticipants]);

  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (localAudioRef.current) {
      localAudioRef.current.stop();
      localAudioRef.current = null;
    }
    if (roomId) {
      try { await leaveRoom(roomId); } catch { /* non-fatal */ }
    }
    setState((prev) => ({ ...prev, connected: false, connecting: false, participants: [] }));
  }, [roomId]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const local = room.localParticipant;
    const audioTrack = Array.from(local.audioTrackPublications.values())[0];
    if (!audioTrack) {
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
    if (audioTrack.isMuted) {
      await audioTrack.unmute();
      setState((prev) => ({ ...prev, isMuted: false }));
    } else {
      await audioTrack.mute();
      setState((prev) => ({ ...prev, isMuted: true }));
    }
    updateParticipants(room);
  }, [role, updateParticipants]);

  const requestToSpeak = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const track = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
      localAudioRef.current = track;
      await room.localParticipant.publishTrack(track);
      setState((prev) => ({ ...prev, canSpeak: true, myRole: "speaker", isMuted: false }));
      updateParticipants(room);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mic access denied";
      setState((prev) => ({ ...prev, error: msg }));
    }
  }, [updateParticipants]);

  useEffect(() => {
    return () => {
      if (roomRef.current) roomRef.current.disconnect();
      if (localAudioRef.current) localAudioRef.current.stop();
    };
  }, []);

  return { state, connect, disconnect, toggleMute, requestToSpeak };
}
