import { useState, useEffect, useCallback } from "react";
import { raldClaim, type AuthUser } from "../lib/api";

export interface LocalUser {
  id:                   string;
  username:             string;
  raldId:               string;
  displayName:          string;
  region:               string;
  reservedEmailAddress: string;
  trustLevel:           string;
  needsVerification:    boolean;
  verificationUrl:      string;
  // isGuest is always false going forward — kept for backward compat reading old localStorage
  isGuest: boolean;
}

type StoredUser = AuthUser & {
  displayName?:          string;
  region?:               string;
  isGuest?:              boolean;
  // legacy guest fields — present in old localStorage values, safe to ignore
  email?:                string;
  reservedEmailAddress?: string;
  needsVerification?:    boolean;
  verificationUrl?:      string;
  trustLevel?:           string;
  username?:             string;
};

export function useAuth() {
  const [user, setUser]       = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("loop_user");
    const token  = localStorage.getItem("loop_jwt");
    if (stored && token) {
      try {
        const parsed = JSON.parse(stored) as StoredUser;
        setUser({
          id:                   parsed.id,
          username:             parsed.username ?? "",
          raldId:               parsed.raldId ?? parsed.id,
          displayName:          parsed.displayName ?? "Listener",
          region:               parsed.region ?? "all",
          reservedEmailAddress: parsed.reservedEmailAddress ?? "",
          trustLevel:           parsed.trustLevel ?? "basic",
          needsVerification:    parsed.needsVerification ?? !parsed.username,
          verificationUrl:      parsed.verificationUrl ?? "https://profiles.rald.cloud/verify",
          isGuest:              false,
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

  /**
   * register — called by Onboarding on completion.
   * Now calls raldClaim() → real RALD identity, real JWT, @username reserved.
   */
  const register = useCallback(async (
    username: string,
    displayName: string,
    region: string,
  ) => {
    setLoading(true);
    try {
      const { user: authUser } = await raldClaim(username, displayName, region);
      const localUser: LocalUser = {
        id:                   authUser.id,
        username:             authUser.username,
        raldId:               authUser.raldId,
        displayName:          authUser.displayName,
        region,
        reservedEmailAddress: authUser.reservedEmailAddress,
        trustLevel:           authUser.trustLevel,
        needsVerification:    authUser.needsVerification,
        verificationUrl:      authUser.verificationUrl,
        isGuest:              false,
      };
      // raldClaim already wrote jwt + user to localStorage
      const stored = JSON.parse(localStorage.getItem("loop_user") ?? "{}") as Record<string, unknown>;
      localStorage.setItem("loop_user", JSON.stringify({ ...stored, region, isGuest: false }));
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
    [],
  );

  /** Mark verification complete — clears the verification banner. */
  const markVerified = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, needsVerification: false, trustLevel: "verified" };
      localStorage.setItem("loop_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("loop_jwt");
    localStorage.removeItem("loop_user");
    setUser(null);
  }, []);

  return { user, loading, register, updateProfile, markVerified, logout };
}
