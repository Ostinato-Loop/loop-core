import { useState, useEffect, useCallback, useRef } from "react";
import { listRooms, type LoopRoom } from "../lib/api";

export function useRooms(region: string = "all") {
  const [rooms, setRooms] = useState<LoopRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await listRooms(region === "all" ? undefined : region);
      setRooms(data);
      setLastUpdated(new Date());
    } catch (err) {
      // SESSION_EXPIRED is handled by the loop:auth:expired DOM event in useAuth —
      // it clears the user and re-renders Onboarding. Don't show it as a UI error.
      if (err instanceof Error && err.message === "SESSION_EXPIRED") return;
      setError(err instanceof Error ? err.message : "Could not load rooms");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(true), 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  return { rooms, loading, error, lastUpdated, refresh: () => load(false) };
}
