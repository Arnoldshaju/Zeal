"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Lock, CheckCircle2, KeyRound } from "lucide-react";
import { AUTH_API_URL, readError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function ResetPasswordClient({ uid, token }: { uid: string; token: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${AUTH_API_URL}/auth/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: values.password }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { detail: string };
      setMessage(data.detail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Set New Password</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your new account password below
            </p>
          </div>
        </div>

        {!uid || !token ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium">
            This password reset link is invalid or incomplete.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Input
              name="password"
              type="password"
              label="New Password"
              placeholder="••••••••"
              minLength={8}
              required
              icon={<Lock className="w-4 h-4" />}
            />

            <Button type="submit" isLoading={busy} className="w-full">
              Update Password
            </Button>
          </form>
        )}

        {message && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Return to sign in &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
