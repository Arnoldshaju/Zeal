"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
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

const columns: { status: TaskStatus; title: string; color: string }[] = [
  { status: "TODO", title: "To do", color: "bg-slate-200" },
  { status: "IN_PROGRESS", title: "In progress", color: "bg-blue-100" },
  { status: "REVIEW", title: "Review", color: "bg-amber-100" },
  { status: "DONE", title: "Done", color: "bg-emerald-100" },
];

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
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [commentText, setCommentText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
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
        current.map((task) => (task.id === updated.id ? updated : task)),
      );
      return updated;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update task.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function selectTask(task: TaskRecord) {
    setSelectedTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setDetailsLoading(true);
    setError("");
    try {
      const [commentResponse, attachmentResponse] = await Promise.all([
        apiFetch(`/v1/tasks/${task.id}/comments/`),
        apiFetch(`/v1/tasks/${task.id}/attachments/`),
      ]);
      if (!commentResponse.ok) throw new Error(await readError(commentResponse));
      if (!attachmentResponse.ok) throw new Error(await readError(attachmentResponse));
      setComments((await commentResponse.json()) as TaskCommentRecord[]);
      setAttachments((await attachmentResponse.json()) as TaskAttachmentRecord[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load task details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function saveTaskDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask || !editTitle.trim()) return;
    await updateTask(selectedTask.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
    });
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask || !commentText.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(`/v1/tasks/${selectedTask.id}/comments/`, {
        method: "POST",
        body: JSON.stringify({ body: commentText.trim() }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const comment = (await response.json()) as TaskCommentRecord;
      setComments((current) => [...current, comment]);
      setCommentText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add comment.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAttachment(file: File | undefined) {
    if (!selectedTask || !file) return;
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiFetch(
        `/v1/tasks/${selectedTask.id}/attachments/`,
        { method: "POST", body: formData },
      );
      if (!response.ok) throw new Error(await readError(response));
      const attachment = (await response.json()) as TaskAttachmentRecord;
      setAttachments((current) => [attachment, ...current]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload file.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-8 text-white">Loading project…</main>;
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <Link href="/dashboard/projects">← Projects</Link>
        <p className="mt-8">{error || "Project not found."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-950 sm:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 text-white">
          <div>
            <Link href="/dashboard/projects" className="text-sm font-semibold text-blue-300">
              ← Projects
            </Link>
            <h1 className="mt-3 text-3xl font-bold">{project.name}</h1>
            <p className="mt-1 text-slate-300">
              {project.description || "No project description"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTaskForm((current) => !current)}
            className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white"
          >
            {showTaskForm ? "Cancel" : "New task"}
          </button>
        </header>

        {error && (
          <p className="mb-5 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        {showTaskForm && (
          <form
            onSubmit={createTask}
            className="mb-6 grid gap-4 rounded-2xl bg-white p-5 md:grid-cols-2 xl:grid-cols-5"
          >
            <label className="text-sm font-medium xl:col-span-2">
              Task title
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                {priorities.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Assignee
              <select
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">Unassigned</option>
                {project.memberships.map((membership) => (
                  <option key={membership.id} value={membership.user}>
                    {membership.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium md:col-span-2 xl:col-span-4">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              disabled={saving}
              className="self-end rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              Create task
            </button>
          </form>
        )}

        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status);
            return (
              <section key={column.status} className="min-h-80 rounded-2xl bg-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">{column.title}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${column.color}`}>
                    {columnTasks.length}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {columnTasks.map((task) => (
                    <article
                      key={task.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => selectTask(task)}
                        className="w-full text-left"
                      >
                        <h3 className="font-semibold">{task.title}</h3>
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {task.priority} · {task.assignee_username ?? "Unassigned"}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Due {task.due_date ?? "not set"}
                        </p>
                      </button>
                      <select
                        aria-label={`Status for ${task.title}`}
                        value={task.status}
                        disabled={saving}
                        onChange={(event) =>
                          void updateTask(task.id, {
                            status: event.target.value as TaskStatus,
                          })
                        }
                        className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      >
                        {columns.map((option) => (
                          <option key={option.status} value={option.status}>
                            {option.title}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))}
                  {columnTasks.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                      No tasks
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {selectedTask && (
          <section className="mt-6 grid gap-6 rounded-2xl bg-white p-6 lg:grid-cols-2">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-bold">Task details</h2>
                <button
                  type="button"
                  onClick={() => setSelectedTaskId("")}
                  className="text-sm font-semibold text-slate-500"
                >
                  Close
                </button>
              </div>
              <form onSubmit={saveTaskDetails} className="mt-5 space-y-4">
                <label className="block text-sm font-medium">
                  Title
                  <input
                    required
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Description
                  <textarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Priority
                    <select
                      value={selectedTask.priority}
                      onChange={(event) =>
                        void updateTask(selectedTask.id, {
                          priority: event.target.value as TaskPriority,
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    >
                      {priorities.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Assignee
                    <select
                      value={selectedTask.assignee ?? ""}
                      onChange={(event) =>
                        void updateTask(selectedTask.id, {
                          assignee: event.target.value
                            ? Number(event.target.value)
                            : null,
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    >
                      <option value="">Unassigned</option>
                      {project.memberships.map((membership) => (
                        <option key={membership.id} value={membership.user}>
                          {membership.username}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  disabled={saving}
                  className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  Save details
                </button>
              </form>

              <div className="mt-8">
                <h3 className="font-bold">Attachments</h3>
                <input
                  type="file"
                  accept=".txt,.pdf,.png,.jpg"
                  disabled={saving}
                  onChange={(event) => {
                    void uploadAttachment(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                  className="mt-3 block w-full text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  TXT, PDF, PNG or JPG · maximum 10 MB
                </p>
                <ul className="mt-3 space-y-2">
                  {attachments.map((attachment) => (
                    <li key={attachment.id} className="text-sm">
                      {attachment.url ? (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-blue-700"
                        >
                          {attachment.original_name}
                        </a>
                      ) : (
                        attachment.original_name
                      )}
                      <span className="ml-2 text-slate-500">
                        {Math.ceil(attachment.size / 1024)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold">Comments</h2>
              {detailsLoading ? (
                <p className="mt-4 text-slate-500">Loading details…</p>
              ) : (
                <>
                  <div className="mt-5 max-h-80 space-y-3 overflow-y-auto">
                    {comments.map((comment) => (
                      <article key={comment.id} className="rounded-xl bg-slate-100 p-4">
                        <div className="flex justify-between gap-3 text-xs text-slate-500">
                          <span className="font-bold">{comment.author_username}</span>
                          <time>{new Date(comment.created_at).toLocaleString()}</time>
                        </div>
                        <p className="mt-2 text-sm">{comment.body}</p>
                      </article>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-sm text-slate-500">No comments yet.</p>
                    )}
                  </div>
                  <form onSubmit={addComment} className="mt-5">
                    <textarea
                      required
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Add a comment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <button
                      disabled={saving}
                      className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                    >
                      Post comment
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
