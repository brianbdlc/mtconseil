// Rend scripts/out/sample.docx en image via docx-preview dans Chromium (Playwright),
// puis screenshot de la fiche « 7.5 TONNES ». `node scripts/render-docx.mjs`.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const docx = fs.readFileSync("scripts/out/sample.docx").toString("base64");
const jszip = fs.readFileSync("node_modules/jszip/dist/jszip.min.js", "utf-8");
const lib = fs.readFileSync("node_modules/docx-preview/dist/docx-preview.js", "utf-8");

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>body{margin:0;background:#fff} .docx-wrapper{background:#fff!important;padding:0!important}
.docx-wrapper>section.docx{box-shadow:none!important;margin:0 auto!important}</style>
<script>${jszip}</script><script>${lib}</script></head>
<body><div id="c"></div>
<script>
  const b64="${docx}";
  const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
  window.__done=false;
  docx.renderAsync(new Blob([bytes]), document.getElementById("c"), null,
    {inWrapper:true, ignoreWidth:false, ignoreHeight:false, breakPages:true})
    .then(()=>{window.__done=true;}).catch(e=>{window.__err=String(e);window.__done=true;});
</script></body></html>`;

const outDir = "scripts/out";
fs.writeFileSync(path.join(outDir, "render.html"), html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2 });
await page.goto("file://" + path.resolve(outDir, "render.html"));
await page.waitForFunction("window.__done===true", { timeout: 30000 });
const err = await page.evaluate("window.__err||''");
if (err) console.log("render error:", err);

// Screenshot pleine page (toutes les pages docx empilées).
await page.screenshot({ path: path.join(outDir, "full.png"), fullPage: true });

// Screenshot ciblé de la fiche « 7.5 TONNES » : on cherche le paragraphe du titre.
const found = await page.evaluate(() => {
  const els = [...document.querySelectorAll("p,span,div")];
  const t = els.find((e) => /7\.5\s*TONNES/i.test(e.textContent || ""));
  if (!t) return null;
  // remonter à la page (section.docx) qui contient le titre.
  let sec = t.closest("section.docx") || t;
  const r = sec.getBoundingClientRect();
  return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
});
if (found) {
  await page.evaluate((y) => window.scrollTo(0, y), found.y);
  const sec = page.locator("section.docx").filter({ hasText: "7.5 TONNES" }).first();
  await sec.screenshot({ path: path.join(outDir, "fiche.png") });
  console.log("fiche.png écrit");
} else {
  console.log("titre 7.5 TONNES introuvable dans le rendu");
}
await browser.close();
console.log("rendu terminé");
