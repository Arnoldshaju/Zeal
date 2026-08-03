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
  owner_username: string; members: DocumentMember[]; workspace: string | null;
  created_at: string; updated_at: string;
};
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";
export type WorkspaceMember = {
  id: string;
  user: number;
  username: string;
  email: string;
  role: WorkspaceRole;
  joined_at: string;
};
export type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  owner: number;
  owner_username: string;
  current_role: WorkspaceRole;
  document_count: number;
  members: WorkspaceMember[];
  created_at: string;
  updated_at: string;
};
export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "COMPLETED"
  | "ARCHIVED";
export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "REVIEW"
  | "DONE";
export type TaskPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";
export type TeamRecord = {
  id: string;
  workspace: string;
  name: string;
  description: string;
  created_by: number;
  created_at: string;
  updated_at: string;
};
export type ProjectRole = "MANAGER" | "CONTRIBUTOR" | "VIEWER";
export type ProjectMembership = {
  id: string;
  user: number;
  username: string;
  role: ProjectRole;
  joined_at: string;
};
export type ProjectRecord = {
  id: string;
  workspace: string;
  team: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  created_by: number;
  start_date: string | null;
  due_date: string | null;
  memberships: ProjectMembership[];
  created_at: string;
  updated_at: string;
};
export type TaskRecord = {
  id: string;
  project: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_by: number;
  assignee: number | null;
  assignee_username: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};
export type TaskCommentRecord = {
  id: string;
  author: number;
  author_username: string;
  body: string;
  created_at: string;
  updated_at: string;
};
export type TaskAttachmentRecord = {
  id: string;
  original_name: string;
  size: number;
  url: string | null;
  uploaded_at: string;
};
export type NotificationRecord = {
  id: string;
  actor: number | null;
  actor_username: string | null;
  task: string | null;
  kind: string;
  message: string;
  target_url: string;
  read_at: string | null;
  created_at: string;
};
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export function paginatedResults<T>(data: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("syncspace:access", access);
  localStorage.setItem("syncspace:refresh", refresh);
}
export function getAccessToken() { return localStorage.getItem("syncspace:access"); }
export function getRefreshToken() { return localStorage.getItem("syncspace:refresh"); }
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
  const data = (await response.json()) as { access: string; refresh?: string };
  localStorage.setItem("syncspace:access", data.access);
  if (data.refresh) localStorage.setItem("syncspace:refresh", data.refresh);
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
