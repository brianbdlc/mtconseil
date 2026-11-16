// Statut de bloc (R1). Langage d'états DESIGN.md : brouillon = amber (à faire),
// confirmé = vert (fait), confirmé mais périmé = amber « À régénérer » (warning).
// Server-safe (pas de "use client").

export default function StatutBadge({ statut, perime }: { statut: string; perime?: boolean }) {
  const confirme = statut === "confirme";
  if (confirme && perime) {
    return (
      <span className="inline-flex items-center rounded-sm bg-amber-tint px-2 py-0.5 text-xs font-medium text-warning">
        À régénérer
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${
        confirme ? "bg-success-tint text-success" : "bg-amber-tint text-warning"
      }`}
    >
      {confirme ? "Confirmé" : "Brouillon"}
    </span>
  );
}
