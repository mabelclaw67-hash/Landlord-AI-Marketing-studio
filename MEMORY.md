# MEMORY — Agent Handoff Notes

> Before modifying this project, read `MEMORY.md`, `docs/01_SYSTEM_ARCHITECTURE.md`, project operation docs, and recent changelog first. Reuse established working patterns before introducing a new implementation.

This file records the architecture that is already verified in production, the failure modes that have already been diagnosed, and how each was recovered. Its purpose is to stop the next agent from re-designing a pipeline that already exists and works.

---

## 1. Working Rules for Agents

- **Do not refactor on sight of a production error.** A visible error is usually a disconnected path, not a missing system.
- **Search first**: existing docs (`docs/`), existing code (especially `src/utils/`), and `git log`. Most "missing" capabilities are already implemented and simply not wired into the current path.
- **Reuse the verified solution.** Prefer an existing helper or an existing page's pattern over a new mechanism.
- **Verify production against the real chain before editing code.** Confirm the actual request URL, action, auth payload, and backend response. Do not trust a frontend error message as a description of backend reality.
- **Minimal change only.** Fix the disconnected link, not the surrounding architecture.
- **Never touch unrelated working-tree changes.** Stage only the files you intentionally modified.

Key reference docs:
`docs/01_SYSTEM_ARCHITECTURE.md` · `docs/02_OPERATIONS_MANUAL.md` · `docs/03_DEVELOPER_HANDBOOK.md` · `docs/04_CHANGELOG.md`

---

## 2. Single Source of Truth

- **Google Drive is the internal asset store and the single source of truth** for listing media.
- **Do not add a parallel database** that duplicates photo, cover, or video metadata. Sheet columns hold *pointers* (fileIds / URLs), not copies of the assets.
- Generated assets live in the listing's own Drive folder:
  - `03_Cover_Images/` — processed / collage cover images
  - `04_Video_Output/` — short video exports

---

## 3. Photo Architecture

- **Normal listing photo reads must never return full-size Base64 for all originals.**
- Historical failure: 18 photos → **~85 MB response, ~101 seconds**.
- Correct behaviour: **metadata + thumbnail URL only**, producing a KB-scale response.
- Collage generation is the only exception:
  - reads **at most 5** selected originals, on demand (`getCollagePhotoData`, capped backend-side)
  - converts them to Data URLs **temporarily**
  - **never** writes those Data URLs back into the normal photos state

---

## 4. Cover Rehydration

- `coverImageFileId` is persisted to the sheet by "Save as Cover" and **must be read back on listing reload**.
- Admin reload must read **both**:
  - the folder root (original photos), and
  - `03_Cover_Images/`
- The saved cover normally lives in the subfolder, **not** the root — resolving only against root photos will always miss it.
- Reuse `resolveRentalListingCover()` (`src/utils/listingPublicMeta.js`). It also builds a thumbnail from a bare fileId when the subfolder listing has not arrived yet.
- Do not depend on transient React state to display the cover.
- **The public page already had the correct pattern** (`src/pages/PublicListing.jsx`); the admin page must stay consistent with it.

---

## 5. Video Architecture

**Google Drive stores video. It does not serve video playback.**

Per `docs/01_SYSTEM_ARCHITECTURE.md`, Drive is internal storage: users must not be given Drive folder URLs, Drive file URLs, or Drive preview pages as a playback source. Independently, a Drive mp4 is technically unusable as a `<video>` source — Drive serves the bytes with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`, so browsers reject every `drive.google.com/uc` and `drive.usercontent.google.com` form with `MEDIA_ERR_SRC_NOT_SUPPORTED`, despite `video/mp4` + `Accept-Ranges: bytes` + `Access-Control-Allow-Origin: *`.

### Correct chain

```
Drive 04_Video_Output/
  → syncVideoUrl_()              (apps-script/Code.gs)
  → uploadVideoToCloudinary_()   (apps-script/Code.gs)
  → sheet column `publicVideoUrl`
  → resolvePlayableVideoUrl()    (src/utils/videoUrls.js)
  → Cloudinary CDN
  → native <video> player
```

Cloudinary credentials live in the `08 System Settings` sheet. Cloudinary upload failure is non-fatal and logged.

### Fallback priority (`resolvePlayableVideoUrl`)

1. Cloudinary `publicVideoUrl`
2. `/videos/<listingId>.mp4` (static files in `public/videos/`)
3. non-Drive direct URL

### Relevant files

`apps-script/Code.gs` · `src/utils/videoUrls.js` · `src/pages/PublicVideoPage.jsx` · `src/pages/admin/ListingDetail.jsx`

### Prohibited

- Do **not** build a Drive iframe player.
- Do **not** use `drive.google.com` or `drive.usercontent.google.com` as a `<video>` source.
- Do **not** treat the browser blob cache as a durable playback source.

---

## 6. Video Rehydration

- A locally generated blob URL (`URL.createObjectURL`, plus the cache in `src/utils/videoCache.js`) is a **current-session preview only**.
- On reload, read the listing's `publicVideoUrl` from the sheet and resolve it through `resolvePlayableVideoUrl()`.
- `04_Video_Output/` may still be read to restore an **admin-only** Drive folder shortcut — that link is an auxiliary entry point, never the playback source.

---

## 7. Apps Script Intermittent 404

An Apps Script POST/GET is answered in two legs. Diagnose them separately.

- **Leg 1** — `POST /exec` — reliably returns **302**. The script body has already executed successfully at this point.
- **Leg 2** — `GET script.googleusercontent.com/macros/echo?user_content_key=…` — intermittently returns **404**. The same echo URL can 404 more than once and then return 200.
- Measured rate: **4/12 failures** without retry; **0/12** after adding a unified retry.

Handling:

- **A 404 does not mean the action or router is missing.** Verify which leg failed before concluding anything about routing or auth.
- Retry belongs in `apiGet` / `apiPost` (`src/utils/api.js`) — **once, centrally**. Do not re-implement retry per business action.
- A browser cannot retry leg 2 alone (`redirect: "manual"` yields an opaque response with no `Location`), so the whole request is re-sent. POST retries are therefore restricted to an explicit idempotent allow-list; append-style intake actions must never be retried.

Relevant file: `src/utils/api.js`

---

## 8. Admin Authentication

Bug found and fixed: a trial record with `approvedModule: "Sale Only"` was admitted to `/admin/rental`. The page rendered as if signed in, but `getStudioRequestAuth("rental")` produced an **empty** auth payload, so the backend answered HTTP 200 with:

```
Access denied. Please sign in with an approved trial access code.
```

This stayed hidden on listing pages because `getListings` / `getListingById` are no-auth actions; it only surfaced on Collage and upload calls.

Principles:

- `AdminGuard` must be **module-aware** — match the trial session against the module the current path will actually send credentials for.
- **Page access and API authorization must agree.** A half-authenticated state — page opens, API rejects — is not acceptable.

Relevant file: `src/components/AdminGuard.jsx`

---

## 9. Asset Reload Principle

**Successful generation ≠ restored system state.**

Reload must rehydrate:

- photos
- manual / saved cover
- generated video
- any persisted asset pointer

Never rely solely on React transient state, browser blob cache, or current-session object URLs. If a file exists in Drive and a pointer exists in the sheet, the UI must be able to rebuild from those two facts alone.

---

## 10. Key Commits

| Commit | Meaning |
|---|---|
| `0a23e2a` | Apps Script echo 404 retry, centralised in `api.js` |
| `19342ff` | Module-aware admin auth gate |
| `7d1167a` | Cover / video reload rehydration from Drive |
| `7579be8` | **Wrong approach** — Drive iframe player |
| `985b039` | Reverted the iframe and restored Cloudinary playback |

> `7579be8` was a mistaken attempt: it used a Drive preview page as the player, which violates the Drive-is-internal architecture rule and was unnecessary because the Cloudinary pipeline already existed and was already populated. It was fully reverted by `985b039` and **must not be reintroduced**.

---

## 11. Troubleshooting Order

1. Read `MEMORY.md` and the architecture docs.
2. Reproduce on production.
3. Verify the actual request URL, action, and auth payload.
4. Distinguish the frontend error message from backend reality.
5. Check whether the Drive data actually exists.
6. Check the persisted sheet pointers / URLs.
7. Reuse an existing helper or the public-page pattern.
8. Only then modify code.
9. Build / test.
10. Deploy.
11. Verify with a real browser reload.
