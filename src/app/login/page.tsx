"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-md bg-amber px-4 font-medium text-navy transition-colors hover:bg-amber-hover disabled:opacity-60"
    >
      {pending ? "Connexion…" : "Se connecter"}
    </button>
  );
}

export default function LoginPage() {
  const [error, formAction] = useActionState(login, null);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-navy">MT Conseil</h1>
        <p className="mt-1 text-sm text-n500">
          Rapports d&apos;audit énergétique
        </p>

        <form action={formAction} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-navy">Courriel</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-11 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-navy">Mot de passe</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-11 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy"
            />
          </label>

          {error && (
            <p className="rounded-md bg-error-tint px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <SubmitButton />
        </form>
      </div>
    </main>
  );
}
