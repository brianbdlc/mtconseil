import { redirect } from "next/navigation";

export default function Home() {
  // Le middleware redirige vers /login si non connecté.
  redirect("/dossiers");
}
