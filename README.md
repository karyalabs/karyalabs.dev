# karyalabs.dev

The hub for every Karya Labs project: the home page at
<https://karyalabs.dev/>, a page for each project at `karyalabs.dev/<project>/`,
and the demo index at <https://demo.karyalabs.dev/>. Every page is generated
from one file, [`projects.toml`](projects.toml).

## How the addresses work

One Cloudflare Worker, `karyalabs-hub`, has the catch-all routes
`karyalabs.dev/*` and `demo.karyalabs.dev/*`. Cloudflare runs the most
specific route that matches, so a project that deploys its own Worker on
`karyalabs.dev/<project>*` keeps that path, and the hub answers everything
else.

| Address | Answered by |
| --- | --- |
| `karyalabs.dev/` | the hub: home |
| `karyalabs.dev/<project>/` | the project's own Worker if it has a route there (gpuicn, Matty), else the hub's page for it (gpui-icons). Both put their web app at `karyalabs.dev/<project>/app/` |
| `demo.karyalabs.dev/` | the hub: demo index |
| `demo.karyalabs.dev/<project>/` | the project's own Worker if it has a route there (Matty), else a redirect: to `demo.redirect` from the registry (gpuicn), or to the project's page |
| `karyalabs.dev/feed.xml` | the hub: Atom feed of every project's releases |
| anything else | the hub's 404 page |

## Add a project

1. Add a `[[project]]` entry to `projects.toml`. The comment at the top lists
   every field, and the build fails with a message if one is wrong.
2. Put its icon in `public/icons/`.
3. Optionally, give it a screenshot (`shot`, a path in
   [karyalabs/assets](https://github.com/karyalabs/assets)) or a specimen
   (`src/specimens/<slug>/`).

That's all. Versions and dates come from the project's GitHub releases at
build time. To give the project its own site later, deploy a Worker with the
route `karyalabs.dev/<slug>*` from its repository; nothing here changes.

To have the hub rebuild as soon as a project releases, add this step to the
end of that project's release workflow, with a token that can dispatch to
this repository:

```yaml
- run: gh api repos/karyalabs/karyalabs.dev/dispatches -f event_type=project-released
  env:
    GH_TOKEN: ${{ secrets.KARYA_DISPATCH_TOKEN }}
```

Without it, the daily build picks the release up.

## Build and run locally

```sh
bun install
bun run build     # fetch releases and screenshots, build dist/, check it
bun run test      # what the Worker answers on each host
bun run check     # type check
bun run preview   # wrangler dev, on http://localhost:8787
```

Without network access to GitHub, save the releases first and read local
screenshots from a clone of karyalabs/assets:

```sh
node -e 'const {execSync}=require("child_process");const o={};for(const r of ["matty","gpuicn","gpui-icons"])o[r]=JSON.parse(execSync(`gh api repos/karyalabs/${r}/releases?per_page=30`));require("fs").writeFileSync("/tmp/releases.json",JSON.stringify(o))'
node scripts/prebuild.mjs --releases /tmp/releases.json --assets ../assets
bunx astro build && node scripts/check-dist.mjs
```

## Deploy

`.github/workflows/site.yml` builds every pull request, and builds and
deploys from `main` on push, on a `project-released` dispatch, daily, and by
hand. Builds run on the organization's self-hosted Linux runner when the
`KARYA_LINUX_RUNNER` variable is set, and on GitHub's runners otherwise.

The deploy needs the organization secret `CLOUDFLARE_API_TOKEN` and the
organization variable `CLOUDFLARE_ACCOUNT_ID`. The token needs **Workers Scripts: Edit** on the
account and **Workers Routes: Edit** on the `karyalabs.dev` zone. Both hosts
already have proxied DNS records for Matty's routes.

## Privacy

No cookies, no analytics and no third-party requests. Fonts, icons and
screenshots are served from this site; `scripts/check-dist.mjs` fails the
build if a page loads anything from another host. The only script is
`public/site.js` (copy buttons, and the address on the 404 page). The CSP in
`worker.js` allows no inline scripts, so check-dist fails on one too.
