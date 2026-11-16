// Reads projects.toml and checks it. Shared by the prebuild script and the
// Astro pages, so a mistake in the registry fails the build with a message
// that names the project and the field.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parse } from "smol-toml";

// Run from the repository root (npm scripts do). Not import.meta.url: Astro
// bundles this file into dist/ when it builds the pages.
const ROOT = pathToFileURL(`${process.cwd()}/`);

// Paths the hub serves itself; a project can't take them as its slug.
export const RESERVED = new Set([
  "about", "api", "assets", "brand", "demo", "feed.xml", "fonts", "icons",
  "shots", "sitemap.xml", "robots.txt", "favicon.ico", "favicon.svg", "404",
]);
const KINDS = new Set(["app", "library"]);
const STATUSES = new Set(["experimental", "beta", "stable", "archived"]);

export function loadProjects() {
  const data = parse(readFileSync(new URL("projects.toml", ROOT), "utf8"));
  const list = data.project ?? [];
  const errors = [];
  const seen = new Set();
  const need = (p, key) => {
    if (typeof p[key] !== "string" || !p[key].trim()) errors.push(`${p.slug ?? "?"}: "${key}" is required`);
  };
  for (const p of list) {
    for (const key of ["slug", "name", "repo", "kind", "tagline", "summary", "icon"]) need(p, key);
    if (typeof p.slug === "string") {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(p.slug)) errors.push(`${p.slug}: slug must be lowercase letters, digits and hyphens`);
      if (RESERVED.has(p.slug) || p.slug.startsWith("_")) errors.push(`${p.slug}: slug is reserved for the hub`);
      if (seen.has(p.slug)) errors.push(`${p.slug}: slug is used twice`);
      seen.add(p.slug);
    }
    if (p.repo && !/^[\w.-]+\/[\w.-]+$/.test(p.repo)) errors.push(`${p.slug}: repo must be owner/name`);
    if (p.kind && !KINDS.has(p.kind)) errors.push(`${p.slug}: kind must be app or library`);
    if (p.status && !STATUSES.has(p.status)) errors.push(`${p.slug}: status must be one of ${[...STATUSES].join(", ")}`);
    if (p.demo && typeof p.demo.note !== "string") errors.push(`${p.slug}: demo needs a note`);
    if (p.demo?.redirect && !p.demo.redirect.startsWith("https://")) errors.push(`${p.slug}: demo.redirect must be an https URL`);
  }
  for (const p of list) {
    for (const dep of p.built_with ?? []) {
      if (!seen.has(dep)) errors.push(`${p.slug}: built_with names "${dep}", which is not in the registry`);
    }
  }
  if (errors.length) throw new Error(`projects.toml:\n  ${errors.join("\n  ")}`);
  return list.map((p) => ({
    built_with: [], links: [], facts: [], about: [], platforms: [],
    ...p,
    used_by: list.filter((q) => (q.built_with ?? []).includes(p.slug)).map((q) => q.slug),
  }));
}
