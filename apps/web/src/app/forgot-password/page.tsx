"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { API_URL, readError } from "@/lib/api";

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
    try {
      const response = await fetch(`${API_URL}/auth/password-reset/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { detail: string; debug_url?: string };
      setMessage(data.detail);
      setDebugUrl(data.debug_url ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not request a reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Zeal</p>
          <h1 className="mt-2 text-3xl font-bold">Reset password</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your account email to receive a reset link.</p>
        </div>
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
        {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {debugUrl && (
          <a
            href={debugUrl}
            className="block rounded-lg border border-blue-200 bg-blue-50 p-3 text-center text-sm font-semibold text-blue-700 underline"
          >
            Open local reset link
          </a>
        )}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:opacity-50">
          {busy ? "Sending…" : "Send reset link"}
        </button>
        <p className="text-center text-sm"><Link href="/login" className="font-semibold underline">Return to sign in</Link></p>
      </form>
    </main>
  );
}
