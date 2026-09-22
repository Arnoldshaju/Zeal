"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail, CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react";
import { AUTH_API_URL, readError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function VerifyEmailClient({
  initialEmail,
  uid,
  token,
}: {
  initialEmail: string;
  uid: string;
  token: string;
}) {
  const [email, setEmail] = useState(initialEmail);

  const [message, setMessage] = useState(
    uid && token
      ? "Confirm your email address to activate sign-in."
      : "Check your email for a verification link. In local development, the link appears in the backend logs."
  );

  const [error, setError] = useState("");
  const [debugUrl, setDebugUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmVerification() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`${AUTH_API_URL}/auth/verify-email/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = (await response.json()) as {
        detail: string;
        debug_url?: string;
      };

      setMessage(data.detail);
      setDebugUrl(data.debug_url ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`${AUTH_API_URL}/auth/verify-email/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = (await response.json()) as { detail: string };
      setMessage(data.detail);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not send verification email."
      );
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
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Verify Email</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
              {message}
            </p>
          </div>
        </div>

        {uid && token ? (
          <Button
            type="button"
            isLoading={busy}
            onClick={confirmVerification}
            className="w-full"
          >
            Confirm Email Verification
          </Button>
        ) : (
          <form onSubmit={resend} className="space-y-4">
            <Input
              type="email"
              label="Email Address"
              placeholder="alex@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
            />

            <Button type="submit" isLoading={busy} className="w-full">
              Resend Verification Email
            </Button>
          </form>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {debugUrl && (
          <a
            href={debugUrl}
            className="block p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Click here for local verification link &rarr;
          </a>
        )}

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