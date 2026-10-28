#!/usr/bin/env bash
# Version preflight — run before starting work and again before any release.
# Read-only: fetches from GitHub and reads Netlify; never changes files or branches.
# Exit code 1 = STOP (stale base or unexpected state); read the lines marked STOP.
set -u
cd "$(dirname "$0")/.." || exit 1

SITE_ID="678aa8d4-81e4-4c19-b4a1-2021c9063e27"   # landlord-ai-marketing-studio (www.vanislandproperty.ca)
stop=0

git fetch origin --prune --quiet || { echo "STOP  could not fetch origin"; exit 1; }
branch=$(git branch --show-current)
main=$(git rev-parse --short origin/main)
head=$(git rev-parse --short HEAD)
behind=$(git rev-list --count HEAD..origin/main)
ahead=$(git rev-list --count origin/main..HEAD)

echo "Project : $(pwd)"
echo "Branch  : ${branch:-<detached>} @ $head"
echo "GitHub  : origin/main @ $main"

if [ "$behind" -gt 0 ]; then
  echo "STOP  this branch is $behind commit(s) behind origin/main — live code is newer than this folder."
  echo "      Start a new branch from origin/main instead of editing here:  git switch -c <name> origin/main"
  stop=1
else
  echo "OK    contains everything on origin/main"
fi
[ "$ahead" -gt 0 ] && echo "INFO  $ahead local commit(s) not on origin/main (unreleased work)"

dirty=$(git status --porcelain --untracked-files=no)
if [ -n "$dirty" ]; then
  echo "WARN  uncommitted changes to tracked files (identify each before editing or releasing):"
  echo "$dirty" | sed 's/^/        /'
fi

if command -v netlify >/dev/null 2>&1; then
  live=$(netlify api getSite --data "{\"site_id\":\"$SITE_ID\"}" 2>/dev/null \
    | python3 -c "import json,sys;d=json.load(sys.stdin)['published_deploy'];print((d.get('commit_ref') or '')[:7],d.get('branch'),d.get('state'))" 2>/dev/null)
  echo "Netlify : production = ${live:-<unreadable>}"
  case "$live" in
    "$main "*) echo "OK    Netlify production is origin/main" ;;
    *) echo "STOP  Netlify production does not match origin/main — find out why before releasing"; stop=1 ;;
  esac
else
  echo "WARN  netlify CLI not found — check the production deploy commit manually"
fi

exit $stop
