import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { admin, loadEnv, TEST_USER } from "./helpers";

// Crée (idempotent) l'utilisateur de test, puis se connecte via l'UI et enregistre
// l'état d'authentification réutilisé par tous les specs.
export default async function globalSetup() {
  loadEnv();
  const a = admin();

  // Utilisateur confirmé (pas d'inscription libre dans l'app → création par service).
  const { data: list } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = list.users.find((u) => u.email === TEST_USER.email);
  if (!user) {
    const { data, error } = await a.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  }
  // Profil (rôle) au cas où une partie de l'app en dépend.
  await a.from("profiles").upsert({ id: user!.id, email: TEST_USER.email, role: "ingenieur" });

  const authDir = path.join("tests", "e2e", ".auth");
  fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/login");
  await page.getByLabel("Courriel").fill(TEST_USER.email);
  await page.getByLabel("Mot de passe").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dossiers", { timeout: 60_000 });
  await page.context().storageState({ path: path.join(authDir, "state.json") });
  await browser.close();
}
