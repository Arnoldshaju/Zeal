"use client";

import React, { useState, useEffect, useMemo, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  Clock,
  Users,
} from "lucide-react";
import {
  apiFetch,
  paginatedResults,
  PaginatedResponse,
  ProjectRecord,
  readError,
  TeamRecord,
  WorkspaceRecord,
  User,
} from "@/lib/api";
import { Sidebar } from "@/components/ui/sidebar";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type ProjectStats = {
  total: number;
  by_status: Record<string, number>;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceRecord | null>(null);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showFormModal, setShowFormModal] = useState(false);

  // Form Fields
  const [workspaceId, setWorkspaceId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const availableTeams = useMemo(
    () => teams.filter((team) => team.workspace === workspaceId),
    [teams, workspaceId]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [meRes, projRes, teamRes, wsRes] = await Promise.all([
          apiFetch("/auth/me/"),
          apiFetch("/v1/projects/"),
          apiFetch("/v1/teams/"),
          apiFetch("/v1/workspaces/"),
        ]);
        if (
          meRes.status === 401 ||
          projRes.status === 401 ||
          teamRes.status === 401 ||
          wsRes.status === 401
        ) {
          router.replace("/login");
          return;
        }
        if (!meRes.ok) throw new Error(await readError(meRes));
        if (!projRes.ok) throw new Error(await readError(projRes));
        if (!teamRes.ok) throw new Error(await readError(teamRes));
        if (!wsRes.ok) throw new Error(await readError(wsRes));

        const userData = (await meRes.json()) as User;
        const projectData = (await projRes.json()) as
          | PaginatedResponse<ProjectRecord>
          | ProjectRecord[];
        const teamData = (await teamRes.json()) as
          | PaginatedResponse<TeamRecord>
          | TeamRecord[];
        const workspaceData = (await wsRes.json()) as
          | PaginatedResponse<WorkspaceRecord>
          | WorkspaceRecord[];

        const availableProjects = paginatedResults(projectData);
        const availableWorkspaces = paginatedResults(workspaceData);

        const countEntries = await Promise.all(
          availableProjects.map(async (project) => {
            const response = await apiFetch(`/v1/projects/${project.id}/stats/`);
            if (!response.ok) return [project.id, 0] as const;
            const stats = (await response.json()) as ProjectStats;
            return [project.id, stats.total] as const;
          })
        );

        if (cancelled) return;
        setUser(userData);
        setProjects(availableProjects);
        setTeams(paginatedResults(teamData));
        setWorkspaces(availableWorkspaces);
        setActiveWorkspace(availableWorkspaces[0] || null);
        setWorkspaceId(availableWorkspaces[0]?.id || "");
        setTaskCounts(Object.fromEntries(countEntries));
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Could not load projects."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId || !name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/v1/projects/", {
        method: "POST",
        body: JSON.stringify({
          workspace: workspaceId,
          team: teamId || null,
          name: name.trim(),
          description: description.trim(),
          status: "PLANNING",
          due_date: dueDate || null,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const project = (await response.json()) as ProjectRecord;
      setProjects((current) => [project, ...current]);
      setTaskCounts((current) => ({ ...current, [project.id]: 0 }));
      setName("");
      setDescription("");
      setDueDate("");
      setTeamId("");
      setShowFormModal(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create project.");
    } finally {
      setSaving(false);
    }
  }

  const statusBadges = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="indigo">In Progress</Badge>;
      case "PLANNING":
        return <Badge variant="warning">Planning</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] overflow-hidden">
      <Sidebar
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={(ws) => {
          setActiveWorkspace(ws);
          setWorkspaceId(ws.id);
        }}
        onCreateWorkspace={() => router.push("/dashboard")}
        currentUser={user}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects" },
          ]}
          user={user}
        />

        <main className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Projects
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage project tasks, assign team members, and track deliverables.
              </p>
            </div>
            <Button onClick={() => setShowFormModal(true)}>
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              title="No projects found"
              description="Create a project to start managing tasks and collaborating with your team."
              actionLabel="Create Project"
              onAction={() => setShowFormModal(true)}
              icon={<FolderKanban className="w-7 h-7" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const team = teams.find((item) => item.id === project.team);
                return (
                  <Link key={project.id} href={`/projects/${project.id}`} className="group">
                    <Card className="p-6 h-full flex flex-col justify-between hover:border-indigo-500/60 hover:shadow-lg transition-all duration-200">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {team?.name || "No Team"}
                          </span>
                          {statusBadges(project.status)}
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {project.name}
                        </h3>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {project.description || "No project description provided."}
                        </p>
                      </div>

                      <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {taskCounts[project.id] ?? 0} Tasks
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Due {project.due_date ? new Date(project.due_date).toLocaleDateString() : "Not set"}
                        </span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modal: Create Project */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title="Create New Project"
        description="Define a project to assign tasks and track team deliverables."
      >
        <form onSubmit={createProject} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                Workspace
              </label>
              <select
                required
                value={workspaceId}
                onChange={(e) => {
                  setWorkspaceId(e.target.value);
                  setTeamId("");
                }}
                className="h-11 px-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                Team (Optional)
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="h-11 px-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
              >
                <option value="">No Team</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Project Name"
            placeholder="e.g. Q3 Mobile App Launch"
            required
            maxLength={150}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are the goals of this project?"
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFormModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
