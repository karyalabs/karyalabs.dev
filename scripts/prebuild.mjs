// Fetches what the pages need from outside the repository, before
// `astro build`: each project's latest GitHub releases (src/generated/
// releases.json) and its screenshots from karyalabs/assets (public/shots/,
// 1200 px, with 640 and 960 px copies for phones and narrow columns).
// The pages never call GitHub, so visitors make no third-party requests.
//
//   node scripts/prebuild.mjs                       fetch everything
//   node scripts/prebuild.mjs --releases file.json  saved API answers,
//                                                   { "<slug>": [release, ...] }
//   node scripts/prebuild.mjs --assets ../assets    read a local assets clone
//
// GITHUB_TOKEN raises the API limit. In CI (CI=true) a failed fetch fails
// the build; locally it warns and the pages leave versions out.
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import sharp from "sharp";
import { loadProjects } from "../src/lib/registry.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const strict = process.env.CI === "true";
const root = new URL("../", import.meta.url);
const projects = loadProjects();

function fail(message) {
  if (strict) throw new Error(message);
  console.warn(`warning: ${message}`);
}

// The first sentence of a release body's first paragraph, as plain text.
export function summarize(body = "") {
  const lines = body.replace(/\r/g, "").split("\n");
  const para = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) { if (para.length) break; continue; }
    if (/^#/.test(t)) { if (para.length) break; continue; }
    if (/^[-*] |^\*\*Full Changelog/.test(t)) { if (para.length) break; continue; }
    para.push(t);
  }
  let text = para.join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim();
  const end = text.search(/[.!?](\s|$)/);
  if (end >= 0) text = text.slice(0, end + 1);
  if (text.length > 180) text = text.slice(0, 177).replace(/\s+\S*$/, "") + "…";
  return text;
}

const shape = (list) => list
  .filter((r) => !r.draft && r.published_at)
  .map((r) => ({
    tag: r.tag_name,
    version: r.tag_name.replace(/^v/, ""),
    date: r.published_at.slice(0, 10),
    url: r.html_url,
    prerelease: r.prerelease,
    summary: summarize(r.body ?? ""),
  }));

async function fetchReleases() {
  const saved = opt("--releases");
  if (saved) {
    const raw = JSON.parse(readFileSync(saved, "utf8"));
    return Object.fromEntries(projects.map((p) => [p.slug, shape(raw[p.slug] ?? [])]));
  }
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "karyalabs-hub-build" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const out = {};
  for (const p of projects) {
    try {
      const res = await fetch(`https://api.github.com/repos/${p.repo}/releases?per_page=30`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      out[p.slug] = shape(await res.json());
    } catch (e) {
      fail(`releases for ${p.repo}: ${e.message}`);
      out[p.slug] = [];
    }
  }
  return out;
}

async function fetchShots() {
  const local = opt("--assets");
  const dir = new URL("public/shots/", root);
  mkdirSync(dir, { recursive: true });
  for (const p of projects) {
    if (!p.shot) continue;
    for (const theme of ["light", "dark"]) {
      const name = `${p.shot}-${theme}-1200.webp`;
      const dest = new URL(`${p.slug}-${theme}.webp`, dir);
      try {
        if (local) {
          const src = `${local}/${name}`;
          if (!existsSync(src)) throw new Error(`${src} is missing`);
          copyFileSync(src, dest);
        } else {
          const res = await fetch(`https://raw.githubusercontent.com/karyalabs/assets/main/${name}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        }
        for (const w of [640, 960]) {
          await sharp(dest.pathname).resize(w).webp({ quality: 80 }).toFile(new URL(`${p.slug}-${theme}-${w}.webp`, dir).pathname);
        }
      } catch (e) {
        fail(`screenshot ${name}: ${e.message}`);
      }
    }
  }
}

const releases = await fetchReleases();
mkdirSync(new URL("src/generated/", root), { recursive: true });
writeFileSync(new URL("src/generated/releases.json", root), JSON.stringify(releases, null, 2) + "\n");
await fetchShots();
console.log(`prebuild: ${projects.length} projects, ${Object.values(releases).flat().length} releases`);
