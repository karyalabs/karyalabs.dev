// What the pages read: the registry plus the releases the prebuild fetched.
import { existsSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
// @ts-ignore: plain JS, shared with the build scripts
import { loadProjects } from "./registry.mjs"

export type Link = { label: string; href: string }
export type Release = { tag: string; version: string; date: string; url: string; prerelease: boolean; summary: string }
export type Project = {
  slug: string; name: string; repo: string; kind: "app" | "library"
  status?: "experimental" | "beta" | "stable" | "archived"
  tagline: string; summary: string; about: string[]; icon: string; shot?: string
  install?: string; get?: Link; links: Link[]; facts: { label: string; value: string }[]
  language?: string; license?: string; platforms: string[]
  built_with: string[]; used_by: string[]
  demo?: { note: string; requires?: string; redirect?: string }
  releases: Release[]; latest?: Release; hasShot: boolean
}

// From the repository root; Astro moves this module when it builds.
const root = pathToFileURL(`${process.cwd()}/`)
const releasesFile = new URL("src/generated/releases.json", root)
const shotsDir = new URL("public/shots/", root)
const releases: Record<string, Release[]> = existsSync(releasesFile)
  ? JSON.parse(readFileSync(releasesFile, "utf8"))
  : {}

export const projects: Project[] = (loadProjects() as Omit<Project, "releases" | "latest" | "hasShot">[]).map((p) => {
  const list = releases[p.slug] ?? []
  return {
    ...p,
    releases: list,
    latest: list[0],
    hasShot: Boolean(p.shot) && ["light", "dark"].every((t) => [".webp", "-640.webp", "-960.webp"].every((s) => existsSync(new URL(`${p.slug}-${t}${s}`, shotsDir)))),
  }
})

export const bySlug = (slug: string) => projects.find((p) => p.slug === slug)

export const allReleases = projects
  .flatMap((p) => p.releases.map((r) => ({ ...r, project: p })))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** "2026-11-15" → "Nov 15, 2026" */
export const longDate = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}, ${d.slice(0, 4)}`
/** "2026-11-15" → "Nov 15" */
export const shortDate = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`

export const kindLabel = (p: Project) =>
  [p.kind === "app" ? "App" : "Library", p.status && p.status[0].toUpperCase() + p.status.slice(1)].filter(Boolean).join(" · ")

export const DEMO_HOST = "https://demo.karyalabs.dev"
