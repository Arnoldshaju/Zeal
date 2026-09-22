// ======================================================
// API URLs
// ======================================================

export const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ??
  "http://127.0.0.1:8000/api";

export const WORKSPACE_API_URL =
  process.env.NEXT_PUBLIC_WORKSPACE_API_URL ??
  "http://127.0.0.1:8000/api";

const REQUEST_TIMEOUT_MS = 10_000;


// ======================================================
// REQUEST SIGNAL
// ======================================================

function requestSignal(
  signal?: AbortSignal | null
): AbortSignal {
  if (signal) {
    return signal;
  }

  const controller = new AbortController();

  setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  return controller.signal;
}


// ======================================================
// TYPES
// ======================================================

export type User = {
  id: number;
  username: string;
  email: string;
};


// ======================================================
// DOCUMENT TYPES
// ======================================================

export type MemberRole =
  | "OWNER"
  | "EDITOR"
  | "VIEWER";

export type DocumentMember = {
  id: string;
  user: number;
  username: string;
  email: string;
  role: MemberRole;
};

export type DocumentRecord = {
  id: string;
  title: string;
  content: Record<string, unknown>;
  owner: number;
  owner_username: string;
  members: DocumentMember[];
  workspace: string;
  created_at: string;
  updated_at: string;
};


// ======================================================
// WORKSPACE TYPES
// ======================================================

export type WorkspaceRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER";

export type WorkspaceMember = {
  id: string;
  user: number;
  username: string;
  email: string;
  role: WorkspaceRole;
};

export type Workspace = {
  id: string;
  name: string;
  owner: number;
  owner_username?: string;
  current_role?: WorkspaceRole;
  document_count?: number;
  members?: WorkspaceMember[];
  created_at?: string;
  updated_at?: string;
};


// ======================================================
// PROJECT & TASK TYPES
// ======================================================

export type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "PAUSED";

export type ProjectMembership = {
  id: string;
  user: number;
  username: string;
  role: string;
};

export type ProjectRecord = {
  id: string;
  workspace: string;
  team?: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  due_date?: string | null;
  memberships: ProjectMembership[];
  created_at: string;
  updated_at: string;
};

export type TeamRecord = {
  id: string;
  workspace: string;
  name: string;
};

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskRecord = {
  id: string;
  project: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: number | null;
  assignee_username?: string;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskCommentRecord = {
  id: string;
  task: string;
  author: number;
  author_username: string;
  body: string;
  created_at: string;
};

export type TaskAttachmentRecord = {
  id: string;
  task: string;
  original_name: string;
  url: string;
  size: number;
  created_at: string;
};

export type NotificationRecord = {
  id: string;
  recipient: number;
  actor_username?: string;
  message: string;
  target_url: string;
  read_at?: string | null;
  created_at: string;
};


// ------------------------------------------------------
// BACKWARD COMPATIBILITY
// ------------------------------------------------------

export type WorkspaceRecord = Workspace;


// ======================================================
// PAGINATION TYPES
// ======================================================

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};


// ======================================================
// TOKEN STORAGE
// ======================================================

const ACCESS_TOKEN_KEY = "zeal_access_token";
const REFRESH_TOKEN_KEY = "zeal_refresh_token";


export function saveTokens(
  access: string,
  refresh: string
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    access
  );

  localStorage.setItem(
    REFRESH_TOKEN_KEY,
    refresh
  );
}


export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(
    ACCESS_TOKEN_KEY
  );
}


export function getRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(
    REFRESH_TOKEN_KEY
  );
}


export function clearTokens(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(
    ACCESS_TOKEN_KEY
  );

  localStorage.removeItem(
    REFRESH_TOKEN_KEY
  );
}


// ======================================================
// ERROR HANDLING
// ======================================================

export async function readError(
  response: Response
): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data === "string") {
      return data;
    }

    if (data.detail) {
      return String(data.detail);
    }

    if (data.message) {
      return String(data.message);
    }

    if (data.error) {
      return String(data.error);
    }

    const firstError =
      Object.values(data)[0];

    if (Array.isArray(firstError)) {
      return String(firstError[0]);
    }

    if (firstError) {
      return String(firstError);
    }

    return `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}


// ======================================================
// COMMON FETCH
// ======================================================

async function apiRequest(
  baseURL: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();

  const headers = new Headers(
    options.headers
  );

  if (
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  return fetch(
    `${baseURL}${path}`,
    {
      ...options,
      headers,
      signal: requestSignal(
        options.signal
      ),
    }
  );
}


// ======================================================
// AUTH FETCH
// ======================================================

export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return apiRequest(
    AUTH_API_URL,
    path,
    options
  );
}


// ======================================================
// WORKSPACE FETCH
// ======================================================

export async function workspaceFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return apiRequest(
    WORKSPACE_API_URL,
    path,
    options
  );
}


// ======================================================
// apiFetch
// ======================================================

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return workspaceFetch(
    path,
    options
  );
}


// ======================================================
// PAGINATION HELPER
// ======================================================

export function paginatedResults<T>(
  data: T[] | PaginatedResponse<T>
): T[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    Array.isArray(data.results)
  ) {
    return data.results;
  }

  return [];
}


// ======================================================
// GET CURRENT USER
// ======================================================

export async function getCurrentUser(): Promise<User> {
  const response =
    await authFetch(
      "/auth/me/"
    );

  if (!response.ok) {
    throw new Error(
      await readError(response)
    );
  }

  return response.json();
}


// ======================================================
// GET WORKSPACES
// ======================================================

export async function getWorkspaces(): Promise<Workspace[]> {
  const response =
    await workspaceFetch(
      "/workspaces/"
    );

  if (!response.ok) {
    throw new Error(
      await readError(response)
    );
  }

  const data =
    await response.json();

  return paginatedResults<Workspace>(
    data
  );
}


// ======================================================
// CREATE WORKSPACE
// ======================================================

export async function createWorkspace(
  name: string
): Promise<Workspace> {
  const response =
    await workspaceFetch(
      "/workspaces/",
      {
        method: "POST",
        body: JSON.stringify({
          name,
        }),
      }
    );

  if (!response.ok) {
    throw new Error(
      await readError(response)
    );
  }

  return response.json();
}


// ======================================================
// GET DOCUMENTS
// ======================================================

export async function getDocuments(
  workspaceId: string
): Promise<DocumentRecord[]> {
  const response =
    await workspaceFetch(
      `/documents/?workspace=${encodeURIComponent(
        workspaceId
      )}`
    );

  if (!response.ok) {
    throw new Error(
      await readError(response)
    );
  }

  const data =
    await response.json();

  return paginatedResults<DocumentRecord>(
    data
  );
}


// ======================================================
// CREATE DOCUMENT
// ======================================================

export async function createDocument(
  workspaceId: string,
  title: string
): Promise<DocumentRecord> {
  const response =
    await workspaceFetch(
      "/documents/",
      {
        method: "POST",
        body: JSON.stringify({
          workspace: workspaceId,
          title,
          content: {},
        }),
      }
    );

  if (!response.ok) {
    throw new Error(
      await readError(response)
    );
  }

  return response.json();
}


// ======================================================
// LOGOUT
// ======================================================

export function logout(): void {
  clearTokens();

  if (
    typeof window !== "undefined"
  ) {
    window.location.href =
      "/login";
  }
}