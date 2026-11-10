# VanIsland Property — public website

Source of the public site **https://www.vanislandproperty.ca** (Netlify site
`landlord-ai-marketing-studio`): landlord services pages, rental listings and
online applications, AI reviews, Home Sale pages and the Admin Studio.

This file is only a pointer. The accurate, maintained documentation is:

| Read this | For |
|---|---|
| `CLAUDE.md` | Mandatory rules: security policy (AASC), version preflight, deployment scope |
| `HANDOFF.md` | Current state, authoritative data sources, incident and fix records |
| `docs/01_SYSTEM_ARCHITECTURE.md` | How the site, Netlify functions and Apps Script fit together |
| `docs/02_OPERATIONS_MANUAL.md` | Day-to-day operation |
| `docs/03_DEVELOPER_HANDBOOK.md` | Development conventions |
| `docs/04_CHANGELOG.md` | Change history |
| `docs/PRODUCTION_BASELINE.md` | Production baseline |
| `apps-script/README.md` | Apps Script backend |

## Working on it

```bash
scripts/preflight.sh     # always first; stop if it prints STOP
npm install
npm run dev              # local site
npm run build            # production build (testing only — never upload a local build)
npm run test:admin-auth
npm run test:rental-resume
```

Releases: merge to `main` on GitHub → Netlify builds and publishes. Merging and
any Apps Script deployment need Mabel's approval.
