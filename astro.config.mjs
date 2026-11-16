// @ts-check
import { defineConfig } from "astro/config"

// A static site. Cloudflare serves dist/ as Worker static assets
// (wrangler.jsonc); worker.js picks the demo pages for demo.karyalabs.dev.
export default defineConfig({
  site: "https://karyalabs.dev",
  trailingSlash: "always",
  build: { inlineStylesheets: "always", format: "directory" },
  devToolbar: { enabled: false },
})
