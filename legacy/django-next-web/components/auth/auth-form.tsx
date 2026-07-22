"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { API_URL, readError, saveTokens } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (isRegister) {
        const registration = await fetch(`${API_URL}/auth/register/`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!registration.ok) throw new Error(await readError(registration));
      }
      const login = await fetch(`${API_URL}/auth/login/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: payload.username, password: payload.password }),
      });
      if (!login.ok) throw new Error(await readError(login));
      const tokens = (await login.json()) as { access: string; refresh: string };
      saveTokens(tokens.access, tokens.refresh); router.push("/dashboard");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong."); }
    finally { setSubmitting(false); }
  }

  const fieldClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow">
        <div><h1 className="text-2xl font-semibold text-slate-900">{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-slate-500">{isRegister ? "Start writing and saving documents." : "Sign in to open your documents."}</p></div>
        <label className="block text-sm font-medium text-slate-700">Username<input name="username" required className={fieldClass} /></label>
        {isRegister && <label className="block text-sm font-medium text-slate-700">Email<input name="email" type="email" required className={fieldClass} /></label>}
        <label className="block text-sm font-medium text-slate-700">Password<input name="password" type="password" minLength={8} required className={fieldClass} /></label>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={submitting} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white disabled:opacity-60">{submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}</button>
        <p className="text-center text-sm text-slate-600">{isRegister ? "Already have an account? " : "Need an account? "}<Link className="font-medium underline" href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Register"}</Link></p>
      </form>
    </main>
  );
}
