export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const REQUEST_TIMEOUT_MS = 10_000;

function requestSignal(signal?: AbortSignal | null) {
  return signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

export type User = { id: number; username: string; email: string };
export type MemberRole = "OWNER" | "EDITOR" | "VIEWER";
export type DocumentMember = {
  id: string; user: number; username: string; email: string; role: MemberRole; created_at: string;
};
export type DocumentRecord = {
  id: string; title: string; content: Record<string, unknown>; owner: number;
  owner_username: string; members: DocumentMember[]; created_at: string; updated_at: string;
};

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("syncspace:access", access);
  localStorage.setItem("syncspace:refresh", refresh);
}
export function getAccessToken() { return localStorage.getItem("syncspace:access"); }
export function clearTokens() {
  localStorage.removeItem("syncspace:access");
  localStorage.removeItem("syncspace:refresh");
}
async function refreshAccessToken() {
  const refresh = localStorage.getItem("syncspace:refresh");
  if (!refresh) return null;
  const response = await fetch(`${API_URL}/auth/refresh/`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }),
    signal: requestSignal(),
  });
  if (!response.ok) { clearTokens(); return null; }
  const data = (await response.json()) as { access: string };
  localStorage.setItem("syncspace:access", data.access);
  return data.access;
}
export async function apiFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    signal: requestSignal(init.signal),
  });
  if (response.status === 401 && retry && await refreshAccessToken()) return apiFetch(path, init, false);
  return response;
}
export async function readError(response: Response) {
  try {
    const data = (await response.json()) as Record<string, unknown>;
    return Object.values(data).flat().join(" ") || "Request failed.";
  } catch { return "Request failed."; }
}
