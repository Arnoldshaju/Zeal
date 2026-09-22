"use client";

import React, { useState, useEffect, useCallback, useMemo, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  FolderKanban,
  Users,
  Plus,
  ArrowUpRight,
  UserPlus,
  Trash2,
  Clock,
  Sparkles,
  Building2,
  BookOpen,
} from "lucide-react";
import {
  apiFetch,
  DocumentRecord,
  PaginatedResponse,
  paginatedResults,
  readError,
  User,
  WorkspaceRecord,
  WorkspaceRole,
} from "@/lib/api";
import { Sidebar } from "@/components/ui/sidebar";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchCommand } from "@/components/ui/search-command";

const SELECTED_WORKSPACE_KEY = "zeal:selected-workspace";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [error, setError] = useState("");
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Modals & Search
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("");
  const [memberUsername, setMemberUsername] = useState("");
  const [memberRole, setMemberRole] = useState<Exclude<WorkspaceRole, "OWNER">>("MEMBER");
  const [saving, setSaving] = useState(false);

  const selectedWorkspace = useMemo(
    () => workspaces.find((w) => w.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces]
  );

  const canManageMembers =
    selectedWorkspace?.current_role === "OWNER" ||
    selectedWorkspace?.current_role === "ADMIN";

  const loadWorkspace = useCallback(async (workspaceId: string) => {
    const response = await apiFetch(`/workspaces/${workspaceId}/`);
    if (!response.ok) throw new Error(await readError(response));
    const updated = (await response.json()) as WorkspaceRecord;
    setWorkspaces((current) =>
      current.map((w) => (w.id === updated.id ? updated : w))
    );
  }, []);

  const loadDocuments = useCallback(async (workspaceId: string) => {
    setDocumentsLoading(true);
    try {
      const response = await apiFetch(
        `/documents/?workspace=${encodeURIComponent(workspaceId)}`
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as
        | PaginatedResponse<DocumentRecord>
        | DocumentRecord[];
      setDocuments(paginatedResults(data));
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
        const workspaceData = (await workspaceResponse.json()) as
          | PaginatedResponse<WorkspaceRecord>
          | WorkspaceRecord[];
        const available = paginatedResults(workspaceData);
        setUser(account);
        setWorkspaces(available);
        const remembered = localStorage.getItem(SELECTED_WORKSPACE_KEY);
        const initial =
          available.find((w) => w.id === remembered) ?? available[0];
        if (initial) {
          setSelectedWorkspaceId(initial.id);
          localStorage.setItem(SELECTED_WORKSPACE_KEY, initial.id);
          await loadDocuments(initial.id);
        }
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Could not load dashboard data.")
      );
  }, [loadDocuments, router]);

  function selectWorkspace(workspace: WorkspaceRecord) {
    setSelectedWorkspaceId(workspace.id);
    localStorage.setItem(SELECTED_WORKSPACE_KEY, workspace.id);
    loadDocuments(workspace.id).catch((caught) =>
      setError(caught instanceof Error ? caught.message : "Could not load documents.")
    );
  }

  async function handleCreateDocument() {
    if (!selectedWorkspaceId) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/documents/", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled Document",
          workspace: selectedWorkspaceId,
          content: { type: "doc", content: [{ type: "paragraph" }] },
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const doc = (await response.json()) as DocumentRecord;
      router.push(`/documents/${doc.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create document.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateWorkspace(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/workspaces/", {
        method: "POST",
        body: JSON.stringify({ name: workspaceName.trim() }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const ws = (await response.json()) as WorkspaceRecord;
      setWorkspaces((prev) => [...prev, ws]);
      selectWorkspace(ws);
      setWorkspaceName("");
      setShowWorkspaceModal(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create workspace.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedWorkspace || !memberUsername.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(`/workspaces/${selectedWorkspace.id}/members/`, {
        method: "POST",
        body: JSON.stringify({ username: memberUsername.trim(), role: memberRole }),
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

  async function handleUpdateMember(userId: number, role: Exclude<WorkspaceRole, "OWNER">) {
    if (!selectedWorkspace) return;
    setSaving(true);
    try {
      const response = await apiFetch(
        `/workspaces/${selectedWorkspace.id}/members/${userId}/`,
        { method: "PATCH", body: JSON.stringify({ role }) }
      );
      if (!response.ok) throw new Error(await readError(response));
      await loadWorkspace(selectedWorkspace.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update member role.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!selectedWorkspace) return;
    setSaving(true);
    try {
      const response = await apiFetch(
        `/workspaces/${selectedWorkspace.id}/members/${userId}/`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error(await readError(response));
      await loadWorkspace(selectedWorkspace.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        workspaces={workspaces}
        activeWorkspace={selectedWorkspace}
        onSelectWorkspace={selectWorkspace}
        onCreateWorkspace={() => setShowWorkspaceModal(true)}
        currentUser={user}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar
          title="Dashboard"
          onOpenSearch={() => setShowSearchModal(true)}
          onNewDocument={handleCreateDocument}
          user={user}
        />

        <main className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Welcome Banner & Overview Stats */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{selectedWorkspace?.name || "Workspace Overview"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome back, {user?.username || "Developer"}!
              </h2>
              <p className="text-xs sm:text-sm text-indigo-200/80">
                You have {documents.length} document{documents.length !== 1 ? "s" : ""} in this workspace.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3">
              {canManageMembers && (
                <Button
                  onClick={() => setShowMembersModal(true)}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Manage Members ({selectedWorkspace?.members?.length || 1})</span>
                </Button>
              )}
              <Button onClick={handleCreateDocument} size="sm" isLoading={saving}>
                <Plus className="w-4 h-4" />
                <span>New Document</span>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="hover:border-indigo-500/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Documents
                </CardTitle>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold">{documents.length}</div>
                <p className="text-xs text-slate-500 mt-1">In {selectedWorkspace?.name || "current workspace"}</p>
              </CardContent>
            </Card>

            <Card className="hover:border-indigo-500/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Workspaces
                </CardTitle>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <Building2 className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold">{workspaces.length}</div>
                <p className="text-xs text-slate-500 mt-1">Available to your user</p>
              </CardContent>
            </Card>

            <Card className="hover:border-indigo-500/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Projects Overview
                </CardTitle>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <FolderKanban className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold">Active</div>
                <Link href="/dashboard/projects" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1 font-medium">
                  <span>View Project Board</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:border-indigo-500/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Role &amp; Access
                </CardTitle>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Users className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">
                  <Badge variant="indigo">{selectedWorkspace?.current_role || "MEMBER"}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">Enforced by backend permissions</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Documents Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Recent Documents
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click any document to open live rich-text Tiptap editor
                </p>
              </div>

              <Button onClick={handleCreateDocument} size="sm" variant="subtle">
                <Plus className="w-4 h-4" />
                <span>Create Document</span>
              </Button>
            </div>

            {documentsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                  </Card>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <EmptyState
                title="No documents yet"
                description="Get started by creating your first collaborative document in this workspace."
                actionLabel="Create Document"
                onAction={handleCreateDocument}
                icon={<BookOpen className="w-7 h-7" />}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="group"
                  >
                    <Card className="p-5 h-full flex flex-col justify-between hover:border-indigo-500/60 hover:shadow-lg transition-all duration-200">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <Badge variant="outline">Doc</Badge>
                        </div>
                        <h4 className="font-semibold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {doc.title}
                        </h4>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate">By @{doc.owner_username}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Modal: New Workspace */}
      <Modal
        isOpen={showWorkspaceModal}
        onClose={() => setShowWorkspaceModal(false)}
        title="Create New Workspace"
        description="Organize documents and projects for a new team or client."
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <Input
            label="Workspace Name"
            placeholder="e.g. Engineering Team"
            required
            maxLength={120}
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowWorkspaceModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manage Members */}
      <Modal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        title={`Workspace Members — ${selectedWorkspace?.name}`}
        description="Add people by their Zeal username and assign roles."
      >
        <div className="space-y-6">
          <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Username"
              required
              value={memberUsername}
              onChange={(e) => setMemberUsername(e.target.value)}
            />
            <select
              value={memberRole}
              onChange={(e) =>
                setMemberRole(e.target.value as Exclude<WorkspaceRole, "OWNER">)
              }
              className="h-11 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
            >
              <option value="MEMBER">Member</option>
              {selectedWorkspace?.current_role === "OWNER" && (
                <option value="ADMIN">Admin</option>
              )}
            </select>
            <Button type="submit" isLoading={saving} size="md">
              Add
            </Button>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
            {selectedWorkspace?.members?.map((member) => (
              <div
                key={member.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={member.username} size="xs" />
                  <div className="truncate">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {member.username}
                    </p>
                    <p className="text-slate-400 truncate">{member.email}</p>
                  </div>
                </div>

                {member.role === "OWNER" ? (
                  <Badge variant="indigo">Owner</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleUpdateMember(
                          member.user,
                          e.target.value as Exclude<WorkspaceRole, "OWNER">
                        )
                      }
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs"
                    >
                      <option value="MEMBER">Member</option>
                      {selectedWorkspace?.current_role === "OWNER" && (
                        <option value="ADMIN">Admin</option>
                      )}
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.user)}
                      className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Global Search Dialog */}
      <SearchCommand
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        documents={documents}
      />
    </div>
  );
}
