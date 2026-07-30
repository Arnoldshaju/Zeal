"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  NotificationRecord,
  paginatedResults,
  PaginatedResponse,
  readError,
} from "@/lib/api";

function notificationHref(notification: NotificationRecord) {
  const projectMatch = notification.target_url.match(/^\/projects\/([^/]+)/);
  return projectMatch ? `/projects/${projectMatch[1]}` : "/dashboard/projects";
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      try {
        const response = await apiFetch("/v1/notifications/");
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) throw new Error(await readError(response));
        const data = (await response.json()) as
          | PaginatedResponse<NotificationRecord>
          | NotificationRecord[];
        if (!cancelled) setNotifications(paginatedResults(data));
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Could not load notifications.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function markRead(notificationId: string) {
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(
        `/v1/notifications/${notificationId}/read/`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error(await readError(response));
      const updated = (await response.json()) as NotificationRecord;
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === updated.id ? updated : notification,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update notification.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function markAllRead() {
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/v1/notifications/read-all/", {
        method: "POST",
      });
      if (!response.ok) throw new Error(await readError(response));
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? readAt,
        })),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update notifications.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm font-semibold text-blue-700">
              ← Workspace
            </Link>
            <p className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-500">
              Zeal
            </p>
            <h1 className="text-3xl font-bold text-slate-950">Notifications</h1>
            <p className="mt-1 text-slate-600">
              {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/projects"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium"
            >
              Projects
            </Link>
            <button
              type="button"
              disabled={saving || unreadCount === 0}
              onClick={markAllRead}
              className="rounded-lg bg-slate-950 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              Mark all read
            </button>
          </div>
        </header>

        {error && (
          <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-slate-600">Loading notifications…</p>
        ) : notifications.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h2 className="text-xl font-bold">You are all caught up</h2>
            <p className="mt-2 text-slate-600">
              Assignment, comment, and due-date updates will appear here.
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border p-5 shadow-sm ${
                  notification.read_at
                    ? "border-slate-200 bg-white"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <span
                      className={`mt-2 h-2.5 w-2.5 rounded-full ${
                        notification.read_at ? "bg-slate-300" : "bg-blue-600"
                      }`}
                    />
                    <div>
                      <p className="font-semibold text-slate-950">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {notification.actor_username
                          ? `From ${notification.actor_username} · `
                          : ""}
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                      <Link
                        href={notificationHref(notification)}
                        className="mt-3 inline-block text-sm font-semibold text-blue-700"
                      >
                        Open project →
                      </Link>
                    </div>
                  </div>
                  {!notification.read_at && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => markRead(notification.id)}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
