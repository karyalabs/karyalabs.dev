// Runs worker.js against dist/ with a stand-in for the ASSETS binding, and
// checks what each host and path answers. Run after `npm run build`.
import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import worker from "../worker.js"

const dist = new URL("../dist/", import.meta.url).pathname
// Like Cloudflare's assets with html_handling "force-trailing-slash".
const ASSETS = {
  async fetch(input) {
    const url = new URL(input.url ?? input)
    let path = decodeURIComponent(url.pathname)
    const file = join(dist, path)
    if (existsSync(file) && statSync(file).isFile()) return new Response(readFileSync(file))
    if (existsSync(join(file, "index.html"))) {
      if (!path.endsWith("/")) return new Response(null, { status: 307, headers: { Location: `${path}/` } })
      return new Response(readFileSync(join(file, "index.html")), { headers: { "Content-Type": "text/html" } })
    }
    return new Response("not found", { status: 404 })
  },
}

const cases = [
  ["https://karyalabs.dev/", 200, "Work, carried through to the end"],
  ["https://karyalabs.dev/gpui-icons/", 200, "The complete Lucide icon set for GPUI."],
  ["https://karyalabs.dev/gpui-icons", 307, "/gpui-icons/"],
  ["https://karyalabs.dev/nothing-here/", 404, "Nothing at this address"],
  ["https://karyalabs.dev/demo/", 301, "https://demo.karyalabs.dev/"],
  ["https://karyalabs.dev/feed.xml", 200, "<feed"],
  ["https://demo.karyalabs.dev/", 200, "Try it in your browser"],
  ["https://demo.karyalabs.dev/gpuicn/", 302, "https://karyalabs.dev/gpuicn/app/"],
  ["https://demo.karyalabs.dev/gpui-icons/", 302, "https://karyalabs.dev/gpui-icons/"],
  ["https://demo.karyalabs.dev/matty/", 302, "https://karyalabs.dev/matty/"],
  ["https://demo.karyalabs.dev/nothing-here/", 404, "Nothing at this address"],
  ["https://demo.karyalabs.dev/fonts/Geist-Regular.woff2", 200, ""],
  ["https://demo.karyalabs.dev/icons/gpuicn.webp", 200, ""],
  ["https://demo.karyalabs.dev/site.js", 200, ""],
]

let failed = 0
for (const [url, status, expect] of cases) {
  const res = await worker.fetch(new Request(url), { ASSETS })
  const where = res.headers.get("Location") ?? ""
  const body = where ? "" : await res.text()
  const ok = res.status === status && (where.includes(expect) || body.includes(expect))
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${url} -> ${res.status} ${where}`)
}
if (failed) {
  console.error(`${failed} of ${cases.length} failed`)
  process.exit(1)
}
