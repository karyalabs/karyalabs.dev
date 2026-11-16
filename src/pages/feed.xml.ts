// Atom feed of every project's releases, newest first.
import { allReleases } from "../lib/data"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export function GET() {
  const items = allReleases.slice(0, 50)
  const updated = items[0] ? `${items[0].date}T00:00:00Z` : new Date().toISOString()
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Karya Labs releases</title>
  <id>https://karyalabs.dev/feed.xml</id>
  <link rel="self" href="https://karyalabs.dev/feed.xml"/>
  <link href="https://karyalabs.dev/"/>
  <updated>${updated}</updated>
  <author><name>Karya Labs</name></author>
${items.map((r) => `  <entry>
    <title>${esc(`${r.project.name} ${r.version}`)}</title>
    <id>${esc(r.url)}</id>
    <link href="${esc(r.url)}"/>
    <updated>${r.date}T00:00:00Z</updated>
    <summary>${esc(r.summary || r.project.tagline)}</summary>
  </entry>`).join("\n")}
</feed>
`
  return new Response(xml, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } })
}
