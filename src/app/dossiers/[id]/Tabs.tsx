"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Tabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/dossiers/${id}`;
  const onglets = [
    { href: base, label: "Dossier", actif: pathname === base },
    { href: `${base}/batiment`, label: "Bâtiment", actif: pathname.startsWith(`${base}/batiment`) },
    { href: `${base}/fiches`, label: "Fiches", actif: pathname.startsWith(`${base}/fiches`) },
    { href: `${base}/redaction`, label: "Rédaction", actif: pathname.startsWith(`${base}/redaction`) },
    { href: `${base}/export`, label: "Export", actif: pathname.startsWith(`${base}/export`) },
  ];

  return (
    <nav className="flex gap-1 border-b border-n200">
      {onglets.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
            o.actif
              ? "border-amber text-navy"
              : "border-transparent text-n500 hover:text-navy"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
