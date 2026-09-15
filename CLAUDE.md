Deployment scope rule (added 2026-09-15):

This repo (`Landlord-AI-Marketing-studio`) deploys **only** to the Netlify site
`landlord-ai-marketing-studio`, serving `www.vanislandproperty.ca` — the public marketing site.

It must **never** be deployed to the `vanisland-portal` Netlify site (the separate Secure Portal at
`portal.vanislandproperty.ca` / `vanisland-portal.netlify.app`, sourced from the separate
`01_Vanisland_UI_Portal` / `Vanisland-Property-Management` repo). A prior incident did exactly this
by mistake — a manual `netlify deploy` was run with the portal's site id but from this repo's
directory, so this repo's own build got published to the portal's site. See
`01_Vanisland_UI_Portal/NETLIFY_PORTAL_PRODUCTION_DEPLOYMENT_2026-09-15.md` for the full writeup.

Before running any manual `netlify deploy`/`netlify api` command from this directory, run
`netlify status` first and confirm `Current project: landlord-ai-marketing-studio`. This repo's
`.netlify/state.json` is linked to that site's id (`678aa8d4-81e4-4c19-b4a1-2021c9063e27`) so a bare
`netlify deploy` here targets it by default — never pass a different `--site-id`.
