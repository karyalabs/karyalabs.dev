// The Worker in front of dist/ (wrangler.jsonc). It runs only for requests
// no project Worker takes: Cloudflare sends karyalabs.dev/matty* and
// karyalabs.dev/gpuicn* to those projects' own Workers, because a more
// specific route wins, and everything else on both hosts comes here.
//
//   karyalabs.dev/...          the static site, or the 404 page
//   demo.karyalabs.dev/        the demo index (dist/demo/)
//   demo.karyalabs.dev/<slug>  redirect from dist/demo/routes.json: to the
//                              demo's own address, or to the project's page
//   karyalabs.dev/demo/        redirect to demo.karyalabs.dev/

const DEMO_HOST = "demo.karyalabs.dev"
// Files the pages load from their own host, on either host.
const SHARED = /^\/(fonts|icons|shots|_astro)\/|^\/(site\.js|favicon\.svg|favicon\.ico|apple-touch-icon\.png|robots\.txt)$/

// Cloudflare doesn't apply a _headers file to responses that go through a
// Worker, and with run_worker_first every response does, so the headers are
// set here. site.js is the only script; the CSP allows no inline ones
// (scripts/check-dist.mjs checks).
const SECURITY = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; require-trusted-types-for 'script'; trusted-types 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}
// Files whose names change when their content does.
const IMMUTABLE = /^\/(fonts|_astro)\//

function withHeaders(res, url) {
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v)
  if (IMMUTABLE.test(url.pathname) && res.ok) out.headers.set("Cache-Control", "public, max-age=31536000, immutable")
  return out
}

async function notFound(env, url) {
  const page = await env.ASSETS.fetch(new URL("/404.html", url))
  return new Response(page.body, { status: 404, headers: page.headers })
}

export default {
  async fetch(request, env) {
    return withHeaders(await route(request, env), new URL(request.url))
  },
}

async function route(request, env) {
  const url = new URL(request.url)

  if (url.hostname === DEMO_HOST) {
    if (SHARED.test(url.pathname)) return env.ASSETS.fetch(request)
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return env.ASSETS.fetch(new URL("/demo/", url))
    }
    const slug = url.pathname.split("/")[1]
    const routes = await (await env.ASSETS.fetch(new URL("/demo/routes.json", url))).json()
    if (Object.hasOwn(routes, slug)) {
      return new Response(null, { status: 302, headers: { Location: routes[slug], "Cache-Control": "max-age=300" } })
    }
    return notFound(env, url)
  }

  if (url.pathname === "/demo" || url.pathname.startsWith("/demo/")) {
    return Response.redirect(`https://${DEMO_HOST}/${url.search}`, 301)
  }
  const res = await env.ASSETS.fetch(request)
  return res.status === 404 ? notFound(env, url) : res
}
