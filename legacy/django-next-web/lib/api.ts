export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export type DocumentContent = { type?: string; content?: unknown[]; [key: string]: unknown };
export type DocumentRecord = {
  id: string; title: string; content: DocumentContent; owner: number;
  owner_username: string; created_at: string; updated_at: string;
};

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("syncspace:access", access);
  localStorage.setItem("syncspace:refresh", refresh);
}
export function clearTokens() {
  localStorage.removeItem("syncspace:access");
  localStorage.removeItem("syncspace:refresh");
}
async function refreshAccessToken() {
  const refresh = localStorage.getItem("syncspace:refresh");
  if (!refresh) return null;
  const response = await fetch(`${API_URL}/auth/refresh/`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }),
  });
  if (!response.ok) { clearTokens(); return null; }
  const data = (await response.json()) as { access: string };
  localStorage.setItem("syncspace:access", data.access);
  return data.access;
}
export async function apiFetch(path: string, init: RequestInit = {}, retry = true) {
  const access = localStorage.getItem("syncspace:access");
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (access) headers.set("Authorization", `Bearer ${access}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && await refreshAccessToken()) return apiFetch(path, init, false);
  return response;
}
export async function readError(response: Response) {
  try {
    const data = (await response.json()) as Record<string, unknown>;
    return Object.values(data).flat().join(" ") || "Request failed.";
  } catch { return "Request failed."; }
}
