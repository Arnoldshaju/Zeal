"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import { AUTH_API_URL, readError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [debugUrl, setDebugUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${AUTH_API_URL}/auth/password-reset/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { detail: string; debug_url?: string };
      setMessage(data.detail);
      setDebugUrl(data.debug_url ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not request a password reset.");
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
            <h1 className="text-xl font-bold tracking-tight">Forgot Password</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your email to receive a password reset link
            </p>
          </div>
        </div>

        {message && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {debugUrl && (
          <a
            href={debugUrl}
            className="block p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Click here to test local reset link &rarr;
          </a>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <Input
            type="email"
            label="Account Email"
            placeholder="alex@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
          />

          <Button type="submit" isLoading={busy} className="w-full">
            Send Reset Link
          </Button>
        </form>

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
