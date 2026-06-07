import { useState, useEffect, useCallback, useRef } from "react";
import { listRooms, type LoopRoom } from "../lib/api";

export function useRooms(region: string = "all") {
  const [rooms, setRooms] = useState<LoopRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await listRooms(region === "all" ? undefined : region);
      setRooms(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load rooms");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(() => fetch(true), 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  return { rooms, loading, error, lastUpdated, refresh: () => fetch(false) };
}
