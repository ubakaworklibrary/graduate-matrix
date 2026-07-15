"use client";

import { useActionState } from "react";
import { login, type LoginActionState } from "@/app/auth-actions";

const initialState: LoginActionState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10 text-ink">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] sm:p-8">
        <div className="border-b-[3px] border-accent pb-4">
          <h1 className="text-2xl font-bold">Graduate Matrix</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
            Graduate Development Platform
          </p>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-bold">Sign in</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Use your existing Graduate Matrix account.
          </p>
        </div>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={pending}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {state.error ? (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
