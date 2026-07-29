"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { API_URL, readError } from "@/lib/api";

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
      const response = await fetch(`${API_URL}/auth/password-reset/confirm/`, {
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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Zeal</p>
          <h1 className="mt-2 text-3xl font-bold">Choose a new password</h1>
        </div>
        {!uid || !token ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">This reset link is incomplete.</p>
        ) : (
          <>
            <label className="block text-sm font-medium">
              New password
              <input name="password" type="password" minLength={4} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <button disabled={busy} className="w-full rounded-lg bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:opacity-50">
              {busy ? "Updating…" : "Update password"}
            </button>
          </>
        )}
        {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <p className="text-center text-sm"><Link href="/login" className="font-semibold underline">Return to sign in</Link></p>
      </form>
    </main>
  );
}
