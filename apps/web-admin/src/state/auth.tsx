import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  tenant_id: string;
  role: string;
  email: string;
  display_name?: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  tenantIdOverride: string | null; // used by Super Admin to act-as tenant via X-Tenant-Id
  login: (tenant_id: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setTenantIdOverride: (tenantId: string | null) => void;
};

const Ctx = createContext<AuthState | null>(null);

const LS_TOKEN = "lv_token";
const LS_USER = "lv_user";
const LS_TENANT_OVERRIDE = "lv_tenant_override";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LS_TOKEN));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(LS_USER);
    return raw ? JSON.parse(raw) : null;
  });
  const [tenantIdOverride, setTenantIdOverrideState] = useState<string | null>(() => localStorage.getItem(LS_TENANT_OVERRIDE));

  useEffect(() => {
    if (token) localStorage.setItem(LS_TOKEN, token);
    else localStorage.removeItem(LS_TOKEN);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
    else localStorage.removeItem(LS_USER);
  }, [user]);

  useEffect(() => {
    if (tenantIdOverride) localStorage.setItem(LS_TENANT_OVERRIDE, tenantIdOverride);
    else localStorage.removeItem(LS_TENANT_OVERRIDE);
  }, [tenantIdOverride]);

  async function login(tenant_id: string, email: string, password: string) {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
    const resp = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id, email, password }),
    });
    if (!resp.ok) throw new Error((await resp.json()).error || "Login failed");
    const data = await resp.json();
    setToken(data.token);
    setUser(data.user);
    setTenantIdOverrideState(null);
  }

  function logout() {
    setToken(null);
    setUser(null);
    setTenantIdOverrideState(null);
  }

  function setTenantIdOverride(tid: string | null) {
    setTenantIdOverrideState(tid);
  }

  const value = useMemo<AuthState>(() => ({
    token, user, tenantIdOverride, login, logout, setTenantIdOverride
  }), [token, user, tenantIdOverride]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
