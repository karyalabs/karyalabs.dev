# Agent guide

- `projects.toml` is the source of every page. Change a project there, not in
  a page. Versions and dates come from GitHub at build time; never hard-code
  one.
- Routing is in `worker.js` and explained in `README.md`. A project's own
  Worker route always wins over the hub's, by design.
- The design is ink on paper from the brand in `karyalabs/.github/brand`:
  Geist, the square full stop, no accent colour. Colour on a page comes only
  from projects' icons and screenshots.
- No third-party requests: everything a page loads is in `public/` or built
  into `dist/`. `bun run build` checks this.
- Before a pull request: `bun run build` and `bun run test`. A visible change
  gets before and after screenshots, light and dark, linked from
  `karyalabs/assets` under `karyalabs.dev/<PR number>/`.
