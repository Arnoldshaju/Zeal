"use client";

import React, { useState, useEffect, useMemo, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
} from "lucide-react";
import {
  apiFetch,
  paginatedResults,
  PaginatedResponse,
  ProjectRecord,
  readError,
  TaskAttachmentRecord,
  TaskCommentRecord,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from "@/lib/api";
import { Navbar } from "@/components/ui/navbar";
import { TaskKanban, TaskItem } from "@/components/ui/task-kanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [comments, setComments] = useState<TaskCommentRecord[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachmentRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadProject() {
      try {
        const [projectResponse, taskResponse] = await Promise.all([
          apiFetch(`/v1/projects/${projectId}/`),
          apiFetch(`/v1/tasks/?project=${encodeURIComponent(projectId)}`),
        ]);
        if (projectResponse.status === 401 || taskResponse.status === 401) {
          router.replace("/login");
          return;
        }
        if (!projectResponse.ok) throw new Error(await readError(projectResponse));
        if (!taskResponse.ok) throw new Error(await readError(taskResponse));
        const projectData = (await projectResponse.json()) as ProjectRecord;
        const taskData = (await taskResponse.json()) as
          | PaginatedResponse<TaskRecord>
          | TaskRecord[];
        if (!cancelled) {
          setProject(projectData);
          setTasks(paginatedResults(taskData));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load project.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/v1/tasks/", {
        method: "POST",
        body: JSON.stringify({
          project: projectId,
          title: title.trim(),
          description: description.trim(),
          status: "TODO",
          priority,
          assignee: assigneeId ? Number(assigneeId) : null,
          due_date: dueDate || null,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const task = (await response.json()) as TaskRecord;
      setTasks((current) => [...current, task]);
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setAssigneeId("");
      setDueDate("");
      setShowTaskForm(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create task.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(taskId: string, changes: Partial<TaskRecord>) {
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(`/v1/tasks/${taskId}/`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      if (!response.ok) throw new Error(await readError(response));
      const updated = (await response.json()) as TaskRecord;
      setTasks((current) =>
        current.map((t) => (t.id === updated.id ? updated : t))
      );
      return updated;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update task.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  // Map tasks to TaskKanban format
  const kanbanItems: TaskItem[] = useMemo(() => {
    return tasks.map((t) => {
      let status: "backlog" | "todo" | "in_progress" | "done" = "todo";
      if (t.status === "TODO") status = "todo";
      else if (t.status === "IN_PROGRESS" || t.status === "REVIEW") status = "in_progress";
      else if (t.status === "DONE") status = "done";

      let priority: "low" | "medium" | "high" = "medium";
      if (t.priority === "LOW") priority = "low";
      else if (t.priority === "HIGH" || t.priority === "URGENT") priority = "high";

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        status,
        priority,
        assignee: t.assignee_username,
        dueDate: t.due_date ?? undefined,
      };
    });
  }, [tasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex flex-col">
        <Navbar breadcrumbs={[{ label: "Projects", href: "/dashboard/projects" }, { label: "Loading..." }]} />
        <div className="p-8 max-w-7xl mx-auto w-full text-slate-500">Loading project data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar
        breadcrumbs={[
          { label: "Projects", href: "/dashboard/projects" },
          { label: project?.name || "Project Details" },
        ]}
      />

      <main className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Project Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-indigo-500" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {project?.name}
              </h1>
              <Badge variant="indigo">{project?.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {project?.description || "No project description provided."}
            </p>
          </div>

          <Button onClick={() => setShowTaskForm(true)}>
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </Button>
        </div>

        {/* Task Kanban View */}
        <TaskKanban
          tasks={kanbanItems}
          onTaskStatusChange={(taskId, newStatus) => {
            let apiStatus: TaskStatus = "TODO";
            if (newStatus === "todo") apiStatus = "TODO";
            else if (newStatus === "in_progress") apiStatus = "IN_PROGRESS";
            else if (newStatus === "done") apiStatus = "DONE";
            void updateTask(taskId, { status: apiStatus });
          }}
          onAddTask={() => setShowTaskForm(true)}
        />
      </main>

      {/* Modal: New Task */}
      <Modal
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        title="Create Task"
        description="Add a new task item to this project board."
      >
        <form onSubmit={createTask} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g. Implement auth flow"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="h-11 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-11 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
              >
                <option value="">Unassigned</option>
                {project?.memberships.map((m) => (
                  <option key={m.id} value={m.user}>
                    {m.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
              placeholder="Add details about this task..."
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTaskForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
