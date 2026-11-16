import { projects } from "../lib/data"

export function GET() {
  const urls = ["https://karyalabs.dev/", "https://demo.karyalabs.dev/", ...projects.map((p) => `https://karyalabs.dev/${p.slug}/`)]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`
  return new Response(xml, { headers: { "Content-Type": "application/xml" } })
}
