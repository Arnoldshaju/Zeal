"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  clearTokens,
  DocumentRecord,
  getRefreshToken,
  readError,
  User,
  WorkspaceRecord,
  WorkspaceRole,
} from "@/lib/api";

const SELECTED_WORKSPACE_KEY = "zeal:selected-workspace";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showWorkspaceForm, setShowWorkspaceForm] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [memberUsername, setMemberUsername] = useState("");
  const [memberRole, setMemberRole] = useState<Exclude<WorkspaceRole, "OWNER">>("MEMBER");
  const [saving, setSaving] = useState(false);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces],
  );
  const canManageMembers =
    selectedWorkspace?.current_role === "OWNER" ||
    selectedWorkspace?.current_role === "ADMIN";

  const loadWorkspace = useCallback(async (workspaceId: string) => {
    const response = await apiFetch(`/workspaces/${workspaceId}/`);
    if (!response.ok) throw new Error(await readError(response));
    const updated = (await response.json()) as WorkspaceRecord;
    setWorkspaces((current) =>
      current.map((workspace) => (workspace.id === updated.id ? updated : workspace)),
    );
  }, []);

  const loadDocuments = useCallback(async (workspaceId: string) => {
    setDocumentsLoading(true);
    try {
      const response = await apiFetch(
        `/documents/?workspace=${encodeURIComponent(workspaceId)}`,
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) throw new Error(await readError(response));
      setDocuments((await response.json()) as DocumentRecord[]);
    } finally {
      setDocumentsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    Promise.all([apiFetch("/auth/me/"), apiFetch("/workspaces/")])
      .then(async ([meResponse, workspaceResponse]) => {
        if (meResponse.status === 401 || workspaceResponse.status === 401) {
          router.replace("/login");
          return;
        }
        if (!meResponse.ok) throw new Error(await readError(meResponse));
        if (!workspaceResponse.ok) throw new Error(await readError(workspaceResponse));
        const account = (await meResponse.json()) as User;
        const available = (await workspaceResponse.json()) as WorkspaceRecord[];
        setUser(account);
        setWorkspaces(available);
        const remembered = localStorage.getItem(SELECTED_WORKSPACE_KEY);
        const initial =
          available.find((workspace) => workspace.id === remembered) ?? available[0];
        if (initial) {
          setSelectedWorkspaceId(initial.id);
          localStorage.setItem(SELECTED_WORKSPACE_KEY, initial.id);
          await loadDocuments(initial.id);
        }
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Could not load workspaces."),
      )
      .finally(() => setLoading(false));
  }, [loadDocuments, router]);

  function selectWorkspace(workspaceId: string) {
    setSelectedWorkspaceId(workspaceId);
    setShowMembers(false);
    localStorage.setItem(SELECTED_WORKSPACE_KEY, workspaceId);
    loadDocuments(workspaceId).catch((caught) =>
      setError(caught instanceof Error ? caught.message : "Could not load documents."),
    );
  }

  async function createDocument() {
    if (!selectedWorkspaceId) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/documents/", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled",
          workspace: selectedWorkspaceId,
          content: { type: "doc", content: [{ type: "paragraph" }] },
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const document = (await response.json()) as DocumentRecord;
      router.push(`/documents/${document.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create document.");
    } finally {
      setSaving(false);
    }
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/workspaces/", {
        method: "POST",
        body: JSON.stringify({ name: workspaceName.trim() }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const workspace = (await response.json()) as WorkspaceRecord;
      setWorkspaces((current) => [...current, workspace]);
      selectWorkspace(workspace.id);
      setWorkspaceName("");
      setShowWorkspaceForm(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create workspace.");
    } finally {
      setSaving(false);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWorkspace || !memberUsername.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(`/workspaces/${selectedWorkspace.id}/members/`, {
        method: "POST",
        body: JSON.stringify({
          username: memberUsername.trim(),
          role: memberRole,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setMemberUsername("");
      await loadWorkspace(selectedWorkspace.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add member.");
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(userId: number, role: Exclude<WorkspaceRole, "OWNER">) {
    if (!selectedWorkspace) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(
        `/workspaces/${selectedWorkspace.id}/members/${userId}/`,
        { method: "PATCH", body: JSON.stringify({ role }) },
      );
      if (!response.ok) throw new Error(await readError(response));
      await loadWorkspace(selectedWorkspace.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update member.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(userId: number) {
    if (!selectedWorkspace) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(
        `/workspaces/${selectedWorkspace.id}/members/${userId}/`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(await readError(response));
      await loadWorkspace(selectedWorkspace.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove member.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    const refresh = getRefreshToken();
    if (refresh) {
      await apiFetch("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      }).catch(() => undefined);
    }
    clearTokens();
    localStorage.removeItem(SELECTED_WORKSPACE_KEY);
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Zeal</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">Workspace</h1>
            <p className="mt-1 text-slate-500">
              {user ? `Signed in as ${user.username}` : "Loading account…"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium"
            >
              Log out
            </button>
            <button
              type="button"
              onClick={() => setShowWorkspaceForm((visible) => !visible)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium"
            >
              New workspace
            </button>
            <button
              type="button"
              onClick={createDocument}
              disabled={!selectedWorkspace || saving}
              className="rounded-lg bg-slate-950 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              New document
            </button>
          </div>
        </header>

        {error && (
          <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        {showWorkspaceForm && (
          <form
            onSubmit={createWorkspace}
            className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <label className="min-w-64 flex-1 text-sm font-medium text-slate-700">
              Workspace name
              <input
                required
                maxLength={120}
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Engineering team"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-950 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              Create workspace
            </button>
          </form>
        )}

        {loading ? (
          <p>Loading workspaces…</p>
        ) : (
          <>
            <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <label className="min-w-64 flex-1 text-sm font-medium text-slate-700">
                  Active workspace
                  <select
                    value={selectedWorkspaceId}
                    onChange={(event) => selectWorkspace(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name} · {workspace.current_role}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedWorkspace && (
                  <div className="text-sm text-slate-500">
                    <p>{selectedWorkspace.document_count} documents</p>
                    <p>{selectedWorkspace.members.length} members</p>
                  </div>
                )}
                {canManageMembers && (
                  <button
                    type="button"
                    onClick={() => setShowMembers((visible) => !visible)}
                    className="rounded-lg border border-slate-300 px-4 py-2 font-medium"
                  >
                    {showMembers ? "Close members" : "Manage members"}
                  </button>
                )}
              </div>
            </section>

            {showMembers && selectedWorkspace && canManageMembers && (
              <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Workspace members</h2>
                  <p className="text-sm text-slate-500">
                    Add people by their existing Zeal username.
                  </p>
                </div>
                <form onSubmit={addMember} className="mb-5 flex flex-wrap gap-3">
                  <input
                    required
                    value={memberUsername}
                    onChange={(event) => setMemberUsername(event.target.value)}
                    placeholder="Username"
                    className="min-w-52 flex-1 rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <select
                    value={memberRole}
                    onChange={(event) =>
                      setMemberRole(event.target.value as Exclude<WorkspaceRole, "OWNER">)
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="MEMBER">Member</option>
                    {selectedWorkspace.current_role === "OWNER" && (
                      <option value="ADMIN">Admin</option>
                    )}
                  </select>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-slate-950 px-4 py-2 font-medium text-white disabled:opacity-50"
                  >
                    Add member
                  </button>
                </form>
                <div className="divide-y divide-slate-200">
                  {selectedWorkspace.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="font-medium">{member.username}</p>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                      {member.role === "OWNER" ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                          Owner
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            aria-label={`Role for ${member.username}`}
                            value={member.role}
                            disabled={
                              saving ||
                              (selectedWorkspace.current_role === "ADMIN" &&
                                member.role === "ADMIN")
                            }
                            onChange={(event) =>
                              updateMember(
                                member.user,
                                event.target.value as Exclude<WorkspaceRole, "OWNER">,
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="MEMBER">Member</option>
                            {selectedWorkspace.current_role === "OWNER" && (
                              <option value="ADMIN">Admin</option>
                            )}
                          </select>
                          <button
                            type="button"
                            disabled={
                              saving ||
                              (selectedWorkspace.current_role === "ADMIN" &&
                                member.role === "ADMIN")
                            }
                            onClick={() => removeMember(member.user)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Documents
                  </p>
                  <h2 className="text-2xl font-bold text-slate-950">
                    {selectedWorkspace?.name ?? "No workspace"}
                  </h2>
                </div>
              </div>
              {documentsLoading ? (
                <p>Loading documents…</p>
              ) : documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                  No documents in this workspace yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {documents.map((document) => (
                    <Link
                      key={document.id}
                      href={`/documents/${document.id}`}
                      className="rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow"
                    >
                      <h3 className="truncate font-semibold">{document.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Owner: {document.owner_username}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Updated {new Date(document.updated_at).toLocaleString()}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
