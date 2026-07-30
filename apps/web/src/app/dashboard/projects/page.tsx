"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  paginatedResults,
  PaginatedResponse,
  ProjectRecord,
  readError,
  TeamRecord,
  WorkspaceRecord,
} from "@/lib/api";

type ProjectStats = {
  total: number;
  by_status: Record<string, number>;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const availableTeams = useMemo(
    () => teams.filter((team) => team.workspace === workspaceId),
    [teams, workspaceId],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadProjects() {
      try {
        const [projectResponse, teamResponse, workspaceResponse] = await Promise.all([
          apiFetch("/v1/projects/"),
          apiFetch("/v1/teams/"),
          apiFetch("/v1/workspaces/"),
        ]);
        if (
          projectResponse.status === 401 ||
          teamResponse.status === 401 ||
          workspaceResponse.status === 401
        ) {
          router.replace("/login");
          return;
        }
        if (!projectResponse.ok) throw new Error(await readError(projectResponse));
        if (!teamResponse.ok) throw new Error(await readError(teamResponse));
        if (!workspaceResponse.ok) throw new Error(await readError(workspaceResponse));

        const projectData = (await projectResponse.json()) as
          | PaginatedResponse<ProjectRecord>
          | ProjectRecord[];
        const teamData = (await teamResponse.json()) as
          | PaginatedResponse<TeamRecord>
          | TeamRecord[];
        const workspaceData = (await workspaceResponse.json()) as
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
          }),
        );
        if (cancelled) return;
        setProjects(availableProjects);
        setTeams(paginatedResults(teamData));
        setWorkspaces(availableWorkspaces);
        setWorkspaceId(availableWorkspaces[0]?.id || "");
        setTaskCounts(Object.fromEntries(countEntries));
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Could not load projects.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProjects();
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
      setShowForm(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm font-semibold text-blue-700">
              ← Workspace
            </Link>
            <p className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-500">
              Zeal
            </p>
            <h1 className="text-3xl font-bold text-slate-950">Projects</h1>
            <p className="mt-1 text-slate-600">
              Plan work, organize teams, and follow every task.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/notifications"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium"
            >
              Notifications
            </Link>
            <button
              type="button"
              onClick={() => setShowForm((current) => !current)}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
            >
              {showForm ? "Cancel" : "New project"}
            </button>
          </div>
        </header>

        {error && (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={createProject}
            className="mb-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
          >
            <label className="text-sm font-medium text-slate-700">
              Workspace
              <select
                required
                value={workspaceId}
                onChange={(event) => {
                  setWorkspaceId(event.target.value);
                  setTeamId("");
                }}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Team
              <select
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">No team</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Project name
              <input
                required
                maxLength={150}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Website launch"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What will this project deliver?"
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={saving || !workspaceId}
              className="rounded-lg bg-slate-950 px-4 py-2 font-medium text-white disabled:opacity-50 md:w-fit"
            >
              {saving ? "Creating…" : "Create project"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-slate-600">Loading projects…</p>
        ) : projects.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h2 className="text-xl font-bold">No projects yet</h2>
            <p className="mt-2 text-slate-600">Create your first project to begin.</p>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const team = teams.find((item) => item.id === project.team);
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-blue-700">
                        {team?.name ?? "No team"}
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-slate-950">
                        {project.name}
                      </h2>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {project.status}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-2 min-h-12 text-sm text-slate-600">
                    {project.description || "No description"}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
                    <span>{taskCounts[project.id] ?? 0} tasks</span>
                    <span>Due {project.due_date ?? "not set"}</span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
