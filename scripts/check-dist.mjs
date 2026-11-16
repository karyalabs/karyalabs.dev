// After `astro build`: every page the Worker relies on exists, and no page
// loads anything from another host.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadProjects } from "../src/lib/registry.mjs";

const dist = new URL("../dist/", import.meta.url).pathname;
const need = ["index.html", "404.html", "demo/index.html", "demo/routes.json", "feed.xml", "sitemap.xml"];
for (const p of loadProjects()) need.push(`${p.slug}/index.html`);
const missing = need.filter((f) => !existsSync(join(dist, f)));

const offsite = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith(".html")) {
      const html = readFileSync(path, "utf8");
      for (const m of html.matchAll(/<(?:script|link|img|source)\b[^>]*\b(?:src|href|srcset)="(https?:)?\/\/[^"]*"/g)) {
        if (!/rel="(?:canonical|alternate)"/.test(m[0])) offsite.push(`${path.slice(dist.length)}: ${m[0]}`);
      }
    }
  }
};
walk(dist);

if (missing.length || offsite.length) {
  for (const f of missing) console.error(`missing dist/${f}`);
  for (const f of offsite) console.error(`loads from another host: ${f}`);
  process.exit(1);
}
console.log(`check-dist: ${need.length} pages, nothing loaded from another host`);
