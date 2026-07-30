# AI Development Runbook

Stable operational facts for working on this repo. Update the version/deployment
numbers here whenever they change in production — everything else on this page
should stay true across sessions.

## Repository

```
mabelclaw67-hash/Landlord-AI-Marketing-Studio
```

Production branch: `main`

## Cross-System Boundary: 01 Internal vs 04 Public

This runbook governs **04**, the public Netlify application at
`https://www.vanislandproperty.ca`. It provides public AI Marketing, Rentals,
Listings, Applications, Open House, Tenant Service Request entry, Public Upload,
and other public client-intake flows.

**01 Internal Property Management** is a separate Mac mini service: `launchd`
keeps it running at `http://localhost:8081`, with private Tailscale access such
as `http://100.x.x.x:8081`. It is not a Netlify project; GitHub is version
control and backup only. Do not create or bind a Netlify Site for 01 unless
Mabel explicitly changes this architecture.

When a feature crosses the systems, first identify its one source of truth and
then use the smallest one-way bridge (stable IDs, minimum API response,
summary, or deep link). Do not create Shadow Databases, duplicate business
records, full scheduled syncs, or bidirectional synchronization. The complete
cross-system diagram and current bridge inventory are in
`docs/01_SYSTEM_ARCHITECTURE.md`.

## Frontend

Netlify auto-deploys from `main` (Git integration — no manual deploy step).

```
Site:    landlord-ai-marketing-studio
Project URL: https://www.vanislandproperty.ca
netlify.toml: build = "npm run build", publish = "dist"
```

To confirm a specific commit actually shipped, check the deploy's `commit_ref`
against the git SHA:

```bash
netlify api listSiteDeploys --data '{"site_id":"678aa8d4-81e4-4c19-b4a1-2021c9063e27","per_page":5}'
```

`state: "ready"` and `commit_ref` matching the commit SHA is a shipped deploy.

## Apps Script (backend)

```
Script ID:               1SottAUJmamosFwhimrmM2zThzQ2ELhyEiKq660vRULi5hGk-oYVTKJBp
Production deployment ID: AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0
Current production version: 106
```

The exec URL for this deployment (`.env` / `.env.local` as `VITE_STUDIO_EXEC_URL`)
should always resolve to `https://script.google.com/macros/s/<deployment ID>/exec`.

### Clasp deployment workflow

There is no `.clasp.json` committed in this repo. Before deploying, search for an
existing authenticated clasp session/staging directory rather than assuming one
must be created from scratch or manually pasted:

```bash
find "$HOME" -iname ".clasp.json" 2>/dev/null
find / -maxdepth 6 -iname ".clasp.json" 2>/dev/null
cat "$HOME/.clasprc.json" >/dev/null 2>&1 && echo "clasp session present"
```

**Do not trust an old staging directory's file list.** Before using any found
directory, verify its scriptId matches the deployment ID above with
`clasp deployments`, and diff its full file list against a fresh `clasp pull` —
a stale directory can be missing files that exist in the live project, and
pushing from it deletes those files from production.

Correct sequence, always from a clean/verified staging directory:

```bash
# 1. Point a staging dir at the production script
mkdir -p /private/tmp/clasp_deploy_landlord_ai && cd /private/tmp/clasp_deploy_landlord_ai
cat > .clasp.json <<'EOF'
{ "scriptId": "1SottAUJmamosFwhimrmM2zThzQ2ELhyEiKq660vRULi5hGk-oYVTKJBp", "rootDir": "" }
EOF

# 2. Pull the live source as the source of truth for the current file set
clasp pull

# 3. Diff every pulled file against the repo's apps-script/*.gs counterpart.
#    Only copy over the files that are actually part of this change — never
#    bulk-sync the whole apps-script/ directory. A repo file with no live
#    counterpart (e.g. a not-yet-deployed feature) must NOT be added here.
cp "<repo>/apps-script/Code.gs" Code.js   # repeat only for changed files

# 4. Push (this updates the script's HEAD/dev source, not any deployment yet)
clasp push --force

# 5. Create a new version snapshot of that source
clasp version "<short description of what changed>"

# 6. Point the EXISTING production deployment ID at the new version.
#    NEVER create a new deployment ID — that changes the production Web App
#    URL and breaks every client using VITE_STUDIO_EXEC_URL.
clasp deploy --deploymentId AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0 \
  --versionNumber <new version number> \
  --description "<same description>"

# 7. Confirm
clasp deployments   # same deployment ID should now show the new version
```

Notes:
- `clasp versions` shows the full version history/descriptions — check the
  current head version number there before creating a new one.
- Testing the live endpoint with `curl -X POST ... -L` can falsely show
  "Page Not Found" — this is a curl POST/redirect-follow quirk against
  Google's Apps Script echo-redirect, not a broken deployment. Use `curl -L`
  with a **GET** `?action=ping` to sanity-check the endpoint is alive, and
  Node's `fetch()` (not curl) if you need to POST-verify a specific action.
- The real admin access code lives only in the "08 System Settings" sheet
  (`PropertiesService`/`ADMIN_ACCESS_CODE`), never hardcoded and not
  necessarily equal to any placeholder value in `.env`/`.env.local`. Do not
  guess at it repeatedly — a handful of failed attempts is fine, brute-forcing
  it is not.

## Protected unrelated working-tree files

These commonly show as locally modified from other concurrent sessions/tools.
**Never stage or commit them as part of an unrelated fix** — leave them exactly
as found unless the user's current request is specifically about them:

```
.claude/launch.json
src/pages/StrategyAssessment.jsx
```

## Required closeout sequence for any backend/frontend fix

1. **Build** — `npm run build` (must succeed, no new errors).
2. **Lint** — `npx eslint <changed files>` (compare against `git stash` baseline
   if pre-existing errors are present in a touched file, so you don't
   misattribute them).
3. **Scoped commit** — stage only the files that are actually part of this fix
   (`git add <specific files>`), never `git add -A`/`git add .`. Verify with
   `git status --short` that the protected files above are not staged.
4. **Push** — `git push origin main`.
5. **Deploy** — frontend is automatic via Netlify on push; backend requires the
   clasp sequence above (never automatic).
6. **Production verification** — confirm the Netlify deploy's `commit_ref`
   matches the pushed SHA, confirm `clasp deployments` shows the same
   deployment ID at the new version, and sanity-check the live endpoint with a
   GET `?action=ping`. Full UI click-through verification requires the real
   admin access code, which this environment does not hold — note that
   limitation explicitly rather than skipping it silently.

## Public upload Turnstile bridge (2026-07-28)

All public file-upload actions must use `/.netlify/functions/public-upload`:

- `uploadSupportingDocument`
- `uploadPublicSupportingDocument`
- `uploadDisputeFile`
- `uploadPropertyStrategyFile`

The frontend sends a fresh Cloudflare Turnstile token with each file request.
`netlify/functions/public-upload.js` verifies it through the shared
`verifyTurnstile` helper before forwarding the request. Apps Script then
requires the matching server-only bridge token before any Drive or Sheets write.

Server-only configuration (never prefix these with `VITE_`, and never commit
their values):

- Netlify: `TURNSTILE_SECRET`, `PUBLIC_UPLOAD_APPS_SCRIPT_URL`, `PUBLIC_UPLOAD_BRIDGE_TOKEN`
- Apps Script Script Properties: `PUBLIC_UPLOAD_BRIDGE_TOKEN`

The Apps Script production deployment is version 102. Roll back by redeploying
the prior production version 101 to the same deployment ID, then revert the
matching Git commit and redeploy Netlify. Never delete uploaded records as part
of a rollback.

Production checks completed on 2026-07-28:

- Missing and invalid Turnstile tokens are rejected by the Netlify function
  before the Apps Script bridge is called.
- A direct Apps Script upload without the bridge token is rejected before any
  Drive or Sheets write.
- With a valid server bridge token, invalid file extensions and files above the
  existing 15 MB dispute/property-strategy limit are rejected before writing.
- `npm run build`, function syntax checks, new-file lint, and secret diff scan
  passed. Existing lint debt in `StrategyAssessment.js` remains outside this
  change.
- A browser-created valid Turnstile token plus harmless test-file upload is a
  required manual final smoke test, because the current automated browser
  surface cannot safely operate the local file picker.

## Property Strategy Assessment: one-time Drive folder init (2026-07-29)

`startPropertyStrategyAssessment` / `uploadPropertyStrategyFile` depend on a
"Property Strategy Files" Drive folder that `apps-script/PropertyStrategyFiles.gs`'s
`setupPropertyStrategyFileStorage()` creates. That function was intentionally
never wired to any action (meant to be run manually, once, from the Apps
Script editor) and had never actually been run in production — so both
actions failed with "Drive folder does not exist yet" until this was found and
fixed. It looked like a missing deployment at first (`startPropertyStrategyAssessment`
failing while `startDisputeReview` succeeded) but `clasp pull --versionNumber <n>`
diffed clean against the repo — always diff the actual deployed version before
assuming a deployment gap.

Fix deployed as version 103: one line added to `Code.gs`'s dispatcher wiring
`setupPropertyStrategyFileStorage` as a permanent admin action (same pattern as
the existing `verifyPropertyStrategyFileStorage`), then called once via an
authenticated POST to actually create the folder. `folderCreated: true` in the
response confirmed the folder was missing before that call. Full record:
`docs/DOCUMENT_FIRST_UPLOAD_HANDOFF_2026-07-29.md` §H.

If a future session finds a public action failing in production while its
sibling actions work, and the deployed source matches the repo exactly,
suspect a one-time/manual initializer that was never run — search the
relevant `.gs` file for a function whose comment says something like "not
wired to any action" or "run once from the editor" before assuming a
deployment or code problem.

## Property Strategy Assessment: report download + recovery (2026-07-29)

Versions 104-106 (current: 106). 104 added `downloadPropertyStrategyReportPdf`
(token-gated real PDF download, mirrors `downloadDisputeReportPdf_`) and
`recoverPropertyStrategyReport` (Assessment ID + email recovery, no public
lookup by ID alone) plus a best-effort confirmation email. 105 was a temporary
admin action used once to delete two UAT test records, built and pushed from
an isolated `/private/tmp` staging copy — never committed to git. 106 reverted
105, confirmed byte-identical to the committed `Code.gs`. Full record:
`docs/DOCUMENT_FIRST_UPLOAD_HANDOFF_2026-07-29.md` §I.

Frontend for both this and the earlier document-first upload work
(`70dd2f9`) shipped in the same push — check Netlify's `commit_ref` against
`git log` if you need to know exactly what's live.
