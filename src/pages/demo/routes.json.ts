// What worker.js does with demo.karyalabs.dev/<slug>/ when no project route
// covers it: redirect to the demo's address, or to the project's page.
import { projects } from "../../lib/data"

export function GET() {
  const routes = Object.fromEntries(
    projects.map((p) => [p.slug, p.demo?.redirect ?? `https://karyalabs.dev/${p.slug}/`]),
  )
  return new Response(JSON.stringify(routes, null, 2) + "\n", { headers: { "Content-Type": "application/json" } })
}
