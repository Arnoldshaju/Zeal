"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { API_URL, readError } from "@/lib/api";

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
      : "Check your email for a verification link. In local development, the link appears in the backend logs.",
  );
  const [error, setError] = useState("");
  const [debugUrl, setDebugUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmVerification() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/auth/verify-email/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { detail: string; debug_url?: string };
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
      const response = await fetch(`${API_URL}/auth/verify-email/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { detail: string };
      setMessage(data.detail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send verification email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Zeal</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Verify email</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        </div>
        {uid && token ? (
          <button
            type="button"
            disabled={busy}
            onClick={confirmVerification}
            className="w-full rounded-lg bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify email"}
          </button>
        ) : (
          <form onSubmit={resend} className="space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              disabled={busy}
              className="w-full rounded-lg bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Sending…" : "Resend verification email"}
            </button>
          </form>
        )}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {debugUrl && (
          <a
            href={debugUrl}
            className="block rounded-lg border border-blue-200 bg-blue-50 p-3 text-center text-sm font-semibold text-blue-700 underline"
          >
            Open local verification link
          </a>
        )}
        <p className="text-center text-sm">
          <Link href="/login" className="font-semibold underline">Return to sign in</Link>
        </p>
      </div>
    </main>
  );
}
