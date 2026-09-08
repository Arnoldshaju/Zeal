"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AUTH_API_URL,
  readError,
  saveTokens,
} from "@/lib/api";

export function AuthForm({
  mode,
}: {
  mode: "login" | "register";
}) {
  const router = useRouter();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const register = mode === "register";

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setBusy(true);
    setError("");

    const formData = new FormData(
      event.currentTarget
    );

    const username = String(
      formData.get("username") ?? ""
    ).trim();

    const email = String(
      formData.get("email") ?? ""
    ).trim();

    const password = String(
      formData.get("password") ?? ""
    );

    try {
      // ==================================================
      // REGISTER
      // ==================================================

      if (register) {
        const response = await fetch(
          `${AUTH_API_URL}/auth/register/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username,
              email,
              password,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            await readError(response)
          );
        }

        router.push(
          `/verify-email?email=${encodeURIComponent(
            email
          )}`
        );

        return;
      }

      // ==================================================
      // LOGIN
      // ==================================================

      const response = await fetch(
        `${AUTH_API_URL}/auth/token/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readError(response)
        );
      }

      const tokens = (await response.json()) as {
        access: string;
        refresh: string;
      };

      // Check that Django actually returned JWT tokens
      if (!tokens.access || !tokens.refresh) {
        throw new Error(
          "Login succeeded but JWT tokens were not returned."
        );
      }

      // Save JWT tokens
      saveTokens(
        tokens.access,
        tokens.refresh
      );

      // Go to workspace/dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      if (caught instanceof TypeError) {
        setError(
          `Cannot connect to the authentication server at ${AUTH_API_URL}. Make sure auth-service is running.`
        );
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : "Request failed."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-600";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-sm"
      >
        {/* ============================================
            HEADER
        ============================================ */}

        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Zeal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {register
              ? "Create account"
              : "Sign in"}
          </h1>
        </div>

        {/* ============================================
            USERNAME
        ============================================ */}

        <label className="block text-sm font-medium">
          Username

          <input
            name="username"
            type="text"
            required
            autoComplete="username"
            className={input}
          />
        </label>

        {/* ============================================
            EMAIL - REGISTER ONLY
        ============================================ */}

        {register && (
          <label className="block text-sm font-medium">
            Email

            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={input}
            />
          </label>
        )}

        {/* ============================================
            PASSWORD
        ============================================ */}

        <label className="block text-sm font-medium">
          Password

          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete={
              register
                ? "new-password"
                : "current-password"
            }
            className={input}
          />
        </label>

        {/* ============================================
            ERROR
        ============================================ */}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ============================================
            SUBMIT BUTTON
        ============================================ */}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Please wait..."
            : register
            ? "Register"
            : "Sign in"}
        </button>

        {/* ============================================
            FORGOT PASSWORD
        ============================================ */}

        {!register && (
          <p className="text-center text-sm">
            <Link
              className="font-semibold text-slate-700 underline"
              href="/forgot-password"
            >
              Forgot your password?
            </Link>
          </p>
        )}

        {/* ============================================
            LOGIN / REGISTER SWITCH
        ============================================ */}

        <p className="text-center text-sm text-slate-600">
          {register
            ? "Already registered? "
            : "Need an account? "}

          <Link
            className="font-semibold underline"
            href={
              register
                ? "/login"
                : "/register"
            }
          >
            {register
              ? "Sign in"
              : "Register"}
          </Link>
        </p>
      </form>
    </main>
  );
}