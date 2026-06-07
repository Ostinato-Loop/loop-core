import { useState, useEffect, useCallback } from "react";
import { guestRegister, type AuthUser } from "../lib/api";

export interface LocalUser {
  id: string;
  raldId: string;
  displayName: string;
  region: string;
  isGuest: boolean;
}

type StoredUser = AuthUser & { displayName?: string; region?: string; isGuest?: boolean };

export function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("loop_user");
    const token = localStorage.getItem("loop_jwt");
    if (stored && token) {
      try {
        const parsed = JSON.parse(stored) as StoredUser;
        setUser({
          id: parsed.id,
          raldId: parsed.raldId ?? parsed.id,
          displayName: parsed.displayName ?? "Listener",
          region: parsed.region ?? "all",
          isGuest: parsed.isGuest ?? true,
        });
      } catch {
        localStorage.removeItem("loop_user");
        localStorage.removeItem("loop_jwt");
      }
    }
    setLoading(false);
  }, []);

  // Listen for auth expiry events dispatched by api.ts on 401
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("loop:auth:expired", handler);
    return () => window.removeEventListener("loop:auth:expired", handler);
  }, []);

  const register = useCallback(async (displayName: string, region: string) => {
    setLoading(true);
    try {
      const { user: authUser } = await guestRegister(displayName);
      const localUser: LocalUser = {
        id: authUser.id,
        raldId: authUser.raldId ?? authUser.id,
        displayName,
        region,
        isGuest: true,
      };
      // Persist region (guestRegister already wrote id/email/displayName to localStorage)
      const stored = JSON.parse(localStorage.getItem("loop_user") ?? "{}") as Record<string, unknown>;
      localStorage.setItem("loop_user", JSON.stringify({ ...stored, region, isGuest: true }));
      setUser(localUser);
      return localUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<Pick<LocalUser, "displayName" | "region">>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, ...updates };
        localStorage.setItem("loop_user", JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("loop_jwt");
    localStorage.removeItem("loop_user");
    setUser(null);
  }, []);

  return { user, loading, register, updateProfile, logout };
}
