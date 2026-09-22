"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { User, Mail, Lock, ArrowRight, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import { AUTH_API_URL, readError, saveTokens } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      if (register) {
        const response = await fetch(`${AUTH_API_URL}/auth/register/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      const response = await fetch(`${AUTH_API_URL}/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const tokens = (await response.json()) as {
        access: string;
        refresh: string;
      };

      if (!tokens.access || !tokens.refresh) {
        throw new Error("Login succeeded but JWT tokens were not returned.");
      }

      saveTokens(tokens.access, tokens.refresh);
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      if (caught instanceof TypeError) {
        setError(
          `Cannot connect to authentication server at ${AUTH_API_URL}. Ensure Zeal Django server is running.`
        );
      } else {
        setError(caught instanceof Error ? caught.message : "Request failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      {/* Left Column - Product Branding & Visual Mockup */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden border-r border-indigo-900/40">
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
              Z
            </div>
            <span className="text-xl font-bold tracking-tight">Zeal</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Middle Visual Card */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Workspace &amp; Document Collaboration</span>
          </div>
          
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            {register
              ? "Join your team in real-time document creation."
              : "Welcome back to your collaborative workspace."}
          </h2>

          <p className="text-indigo-200/80 text-base leading-relaxed">
            Zeal combines Notion-style document editing with Linear task workflows and live WebSocket collaboration.
          </p>

          <div className="space-y-3 pt-2">
            {[
              "End-to-end WebSocket real-time document editing",
              "Personal and team workspaces with permissions",
              "Integrated task boards, comments & revision history",
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-indigo-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-indigo-300/60 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>JWT Protected &bull; Idempotent Document Engine</span>
        </div>
      </div>

      {/* Right Column - Form Card */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative">
        <div className="lg:hidden absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
                Z
              </div>
              <span className="text-2xl font-bold tracking-tight">Zeal</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {register ? "Create your account" : "Sign in to Zeal"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {register
                ? "Enter your details to set up your account and workspace"
                : "Enter your credentials to access your workspaces"}
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium leading-relaxed animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <Input
              name="username"
              type="text"
              label="Username"
              placeholder="e.g. alexsmith"
              required
              autoComplete="username"
              icon={<User className="w-4 h-4" />}
            />

            {register && (
              <Input
                name="email"
                type="email"
                label="Email address"
                placeholder="alex@example.com"
                required
                autoComplete="email"
                icon={<Mail className="w-4 h-4" />}
              />
            )}

            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              minLength={8}
              required
              autoComplete={register ? "new-password" : "current-password"}
              icon={<Lock className="w-4 h-4" />}
            />

            {!register && (
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              isLoading={busy}
              className="w-full mt-2"
            >
              <span>{register ? "Create Account" : "Sign In"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            {register ? "Already have an account? " : "Don't have an account? "}
            <Link
              href={register ? "/login" : "/register"}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {register ? "Sign in" : "Register"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}