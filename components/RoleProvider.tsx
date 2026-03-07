"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { UserContext, UserRole } from "@/lib/types";

interface RoleContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  role: UserRole;
  userId: string;
  displayName: string;
  email: string;
  assignedRoles: UserRole[];
  permissions: string[];
  setRole: (next: UserRole) => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<void>;
  signup: (payload: { displayName: string; email: string; password: string; assignedRoles: UserRole[] }) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ token: string | null; expiresAt: string | null; message: string }>;
  resetPassword: (payload: { token: string; password: string }) => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const tokenStorageKey = "auth-session-token";

const unauthenticatedContext: UserContext = {
  isAuthenticated: false,
  userId: "",
  email: "",
  displayName: "",
  role: "analyst",
  assignedRoles: [],
  permissions: [],
  compartments: [],
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [context, setContext] = useState<UserContext>(unauthenticatedContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(tokenStorageKey);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    api.getMe(storedToken)
      .then((user) => setContext(user))
      .catch(() => {
        window.localStorage.removeItem(tokenStorageKey);
        setToken(null);
        setContext(unauthenticatedContext);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function applyAuthResult(result: { token: string; user: UserContext }) {
    window.localStorage.setItem(tokenStorageKey, result.token);
    setToken(result.token);
    setContext(result.user);
  }

  async function login(payload: { email: string; password: string }) {
    const result = await api.login(payload);
    await applyAuthResult(result);
  }

  async function signup(payload: { displayName: string; email: string; password: string; assignedRoles: UserRole[] }) {
    const result = await api.signup(payload);
    await applyAuthResult(result);
  }

  async function logout() {
    if (token) {
      await api.logout(token).catch(() => undefined);
    }
    window.localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setContext(unauthenticatedContext);
  }

  async function setRole(next: UserRole) {
    if (!token || next === context.role) return;
    const result = await api.switchRole(token, next);
    setContext(result.user);
  }

  async function requestPasswordReset(email: string) {
    return api.requestPasswordReset(email);
  }

  async function resetPassword(payload: { token: string; password: string }) {
    await api.resetPassword(payload);
  }

  return (
    <RoleContext.Provider
      value={{
        isLoading,
        isAuthenticated: context.isAuthenticated,
        token,
        role: context.role,
        userId: context.userId,
        displayName: context.displayName,
        email: context.email,
        assignedRoles: context.assignedRoles,
        permissions: context.permissions,
        setRole,
        login,
        signup,
        logout,
        requestPasswordReset,
        resetPassword,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used inside RoleProvider");
  }
  return context;
}
