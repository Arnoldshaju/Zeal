"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ArrowRight, Clock } from "lucide-react";
import {
  apiFetch,
  NotificationRecord,
  paginatedResults,
  PaginatedResponse,
  readError,
} from "@/lib/api";
import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

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
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
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
            caught instanceof Error ? caught.message : "Could not load notifications."
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
        { method: "POST" }
      );
      if (!response.ok) throw new Error(await readError(response));
      const updated = (await response.json()) as NotificationRecord;
      setNotifications((current) =>
        current.map((n) => (n.id === updated.id ? updated : n))
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update notification."
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
        current.map((n) => ({
          ...n,
          read_at: n.read_at ?? readAt,
        }))
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update notifications."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Notifications" },
        ]}
      />

      <main className="p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-8 flex-1">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Notifications
              </h1>
              {unreadCount > 0 && <Badge variant="indigo">{unreadCount} Unread</Badge>}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Task assignments, comments, and due date reminders.
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              onClick={markAllRead}
              variant="outline"
              size="sm"
              isLoading={saving}
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="You're all caught up!"
            description="When team members assign tasks or comment on your projects, notifications will appear here."
            icon={<Bell className="w-7 h-7" />}
          />
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`p-5 transition-all ${
                  !n.read_at
                    ? "border-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs"
                    : "opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        !n.read_at ? "bg-indigo-600 animate-pulse" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    />
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {n.message}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                        {n.actor_username && (
                          <span>From @{n.actor_username}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="pt-2">
                        <Link
                          href={notificationHref(n)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <span>Open Project Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {!n.read_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markRead(n.id)}
                      isLoading={saving}
                      className="text-xs"
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
