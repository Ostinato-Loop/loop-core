import { useState, useEffect, useCallback } from "react";
import { guestRegister, type AuthUser } from "../lib/api";

export interface LocalUser {
  id: string;
  raldId: string;
  displayName: string;
  region: string;
  isGuest: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("loop_user");
    const token = localStorage.getItem("loop_jwt");
    if (stored && token) {
      try {
        const parsed = JSON.parse(stored) as AuthUser & { displayName?: string; region?: string; isGuest?: boolean };
        setUser({
          id: parsed.id,
          raldId: parsed.raldId,
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

  const register = useCallback(async (displayName: string, region: string) => {
    setLoading(true);
    try {
      const { user: authUser } = await guestRegister(displayName);
      const localUser: LocalUser = {
        id: authUser.id,
        raldId: authUser.raldId,
        displayName,
        region,
        isGuest: true,
      };
      const stored = JSON.parse(localStorage.getItem("loop_user") ?? "{}") as Record<string, unknown>;
      localStorage.setItem("loop_user", JSON.stringify({ ...stored, ...localUser }));
      setUser(localUser);
      return localUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback((updates: Partial<Pick<LocalUser, "displayName" | "region">>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem("loop_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("loop_jwt");
    localStorage.removeItem("loop_user");
    setUser(null);
  }, []);

  return { user, loading, register, updateProfile, logout };
}
