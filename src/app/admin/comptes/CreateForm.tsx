"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createCompte } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-md bg-amber px-4 font-medium text-navy transition-colors hover:bg-amber-hover disabled:opacity-60"
    >
      {pending ? "Création…" : "Créer le compte"}
    </button>
  );
}

export default function CreateForm() {
  const [message, formAction] = useActionState(createCompte, null);
  const isError = message !== null && !message.startsWith("Compte créé");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-navy">Courriel</span>
        <input
          name="email"
          type="email"
          required
          className="h-11 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-navy">
          Mot de passe temporaire
        </span>
        <input
          name="password"
          type="text"
          required
          minLength={6}
          className="h-11 rounded-md border border-n200 bg-n0 px-3 font-mono text-navy outline-none focus:border-navy"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-navy">Rôle</span>
        <select
          name="role"
          defaultValue="ingenieur"
          className="h-11 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy"
        >
          <option value="ingenieur">Ingénieur</option>
          <option value="admin">Administrateur</option>
        </select>
      </label>

      {message && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            isError ? "bg-error-tint text-error" : "bg-success-tint text-success"
          }`}
        >
          {message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
