# Traceline

AI indoor positioning for sparse infrastructure. Static site, no dependencies.

- `src/pages/*.html` page content, `src/layout.html` shared header and footer
- `src/team.json` team name, institute and members shown in the footer
- `assets/` styles, scripts, logo
- `npm run build` (or `node build.mjs`) writes the site to `dist/`

Deploy on Vercel: import the repo, no framework preset; `vercel.json` sets the build command and `dist` output.
