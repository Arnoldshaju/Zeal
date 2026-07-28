"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { API_URL, readError, saveTokens } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (register) {
        const response = await fetch(`${API_URL}/auth/register/`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
        });
        if (!response.ok) throw new Error(await readError(response));
      }
      const response = await fetch(`${API_URL}/auth/login/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: values.username, password: values.password }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const tokens = (await response.json()) as { access: string; refresh: string };
      saveTokens(tokens.access, tokens.refresh); router.push("/dashboard");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Request failed."); }
    finally { setBusy(false); }
  }
  const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-600";
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
    <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-sm">
      <div><p className="text-sm font-bold uppercase tracking-widest text-slate-500">Zeal</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{register ? "Create account" : "Sign in"}</h1></div>
      <label className="block text-sm font-medium">Username<input name="username" required className={input} /></label>
      {register && <label className="block text-sm font-medium">Email<input name="email" type="email" required className={input} /></label>}
      <label className="block text-sm font-medium">Password<input name="password" type="password" minLength={4} required className={input} /></label>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? "Please wait…" : register ? "Register" : "Sign in"}</button>
      <p className="text-center text-sm text-slate-600">{register ? "Already registered? " : "Need an account? "}<Link className="font-semibold underline" href={register ? "/login" : "/register"}>{register ? "Sign in" : "Register"}</Link></p>
    </form>
  </main>;
}
