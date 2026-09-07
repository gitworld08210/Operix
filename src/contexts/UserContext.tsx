"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, ApiResponse } from "@/types";

/**
 * Session-backed user state.
 *
 * Identity now lives in an httpOnly session cookie that JavaScript cannot read,
 * so this context does NOT persist the user to localStorage. On mount it asks
 * the server who the caller is (`GET /api/auth/me`); the cookie is the single
 * source of truth. That is the whole point of the change: previously any visitor
 * could grant themselves an account — including a premium one — by editing
 * localStorage.
 *
 * The public API (`user`, `login`, `logout`, `updateUser`, `loading`) is kept so
 * existing consumers keep working, with one deliberate change: `login` now takes
 * credentials and returns a result, instead of accepting a caller-fabricated
 * `User`.
 */

/** Outcome of a sign-in attempt, so forms can render server-side errors. */
export interface AuthResult {
  success: boolean;
  /** User-facing error message when `success` is false. */
  error?: string;
  /** The signed-in user when `success` is true. */
  user?: User;
}

/** Fields accepted by {@link UserContextType.register}. */
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface UserContextType {
  user: User | null;
  /** Sign in with real credentials against POST /api/auth/login. */
  login: (email: string, password: string) => Promise<AuthResult>;
  /** Sign in as an administrator against POST /api/auth/admin/login. */
  loginAsAdmin: (email: string, password: string) => Promise<AuthResult>;
  /** Create an account against POST /api/auth/register. */
  register: (input: RegisterInput) => Promise<AuthResult>;
  /** Clear the server session cookie and local state. */
  logout: () => Promise<void>;
  /** Replace local user state (e.g. after a client-side profile change). */
  updateUser: (user: User) => void;
  /** Re-read the session from the server. */
  refresh: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/** Fallback message when the server gives no usable error text. */
const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * POST JSON to an auth endpoint and normalise the outcome into an
 * {@link AuthResult}. `credentials: "same-origin"` is explicit (it is also the
 * default) because the whole flow depends on the session cookie travelling.
 */
async function postAuth(
  url: string,
  payload: unknown,
): Promise<AuthResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    let body: ApiResponse<User> | null = null;
    try {
      body = (await response.json()) as ApiResponse<User>;
    } catch {
      // Non-JSON response (proxy error page, etc.).
      body = null;
    }

    if (!response.ok || !body?.success || !body.data) {
      return {
        success: false,
        error: body?.message ?? body?.error ?? GENERIC_ERROR,
      };
    }

    return { success: true, user: body.data };
  } catch {
    // Network failure / offline.
    return { success: false, error: "Cannot reach the server. Check your connection." };
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Ask the server who the caller is. A 401 is the normal "signed out" answer,
   * not an error worth surfacing.
   */
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "same-origin",
        // Identity must never come from the HTTP cache.
        cache: "no-store",
      });

      if (!response.ok) {
        setUser(null);
        return;
      }

      const body = (await response.json()) as ApiResponse<User>;
      setUser(body.success && body.data ? body.data : null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Rehydrate from the session cookie on mount.
    (async () => {
      await refresh();
      // Avoid a state update if the provider unmounted mid-flight.
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await postAuth("/api/auth/login", { email, password });
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  const loginAsAdmin = useCallback(async (email: string, password: string) => {
    const result = await postAuth("/api/auth/admin/login", { email, password });
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await postAuth("/api/auth/register", input);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      // Only the server can clear an httpOnly cookie.
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Even if the request fails, drop local state so the UI reflects intent.
    } finally {
      setUser(null);
      // Not identity, just playback state, so it stays in localStorage.
      try {
        localStorage.removeItem("ott_ad_completed");
      } catch {
        // localStorage can throw in private-mode / storage-disabled browsers.
      }
    }
  }, []);

  /**
   * Update local user state only. Persisting a profile change needs a server
   * endpoint; until one exists this is in-memory and will not survive a reload
   * (previously it wrote to localStorage, which merely made the staleness less
   * visible while letting anyone forge premium access).
   */
  const updateUser = useCallback((userData: User) => {
    setUser(userData);
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        loginAsAdmin,
        register,
        logout,
        updateUser,
        refresh,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export default UserContext;
