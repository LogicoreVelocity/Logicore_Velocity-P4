import { CONFIG } from "./config";

export async function apiRequest(token: string, path: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {}),
    Authorization: `Bearer ${token}`,
  };

  const resp = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new Error(data?.error || `Request failed: ${resp.status}`);
  }

  return data;
}