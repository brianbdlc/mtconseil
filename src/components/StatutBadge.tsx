// Statut de bloc (R1). Langage d'états DESIGN.md : brouillon = amber (à faire),
// confirmé = vert (fait). Server-safe (pas de "use client").

export default function StatutBadge({ statut }: { statut: string }) {
  const confirme = statut === "confirme";
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${
        confirme
          ? "bg-success-tint text-success"
          : "bg-amber-tint text-warning"
      }`}
    >
      {confirme ? "Confirmé" : "Brouillon"}
    </span>
  );
}
