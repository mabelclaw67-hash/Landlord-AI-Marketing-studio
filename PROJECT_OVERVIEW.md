# Vanisland AI Marketing Studio — Project Overview

**Last updated:** 2026-05-11  
**Stack:** React 19 + Vite 8 · React Router 7 · Google Apps Script · Netlify

---

## 1. Architecture Summary

The site is a single-page application (SPA) built with React and served as a static bundle. There is no traditional server — all business logic runs in the browser, and data persistence is handled by a Google Apps Script web app that reads and writes a Google Sheet.

```
Browser (React SPA)
    │
    ├── Public pages       (tenant-facing: view listings, apply, share)
    ├── Landlord pages     (landlord-facing: home, services, resources, contact)
    └── Admin pages        (6-digit code protected: create/edit/publish listings)
         │
         └── Google Apps Script Web App
                  │
                  ├── Google Sheet   (listing data store)
                  └── Google Drive   (listing photos / files)
```

When `VITE_STUDIO_EXEC_URL` is **not** set, the app falls back to `localStorage` (prototype/demo mode). All components are identical in both modes — only the storage adapter switches.

---

## 2. Frontend Framework & Project Layout

| Item | Detail |
|---|---|
| Framework | React 19 (JSX, functional components, hooks) |
| Bundler | Vite 8 |
| Routing | React Router v7 (`BrowserRouter`) |
| Styling | Single global CSS file (`src/styles/global.css`) |
| Language support | English / 中文 — toggled via `lang` state in `App.jsx` |

### Folder structure

```
04_landlord-ai-marketing-studio/
├── apps-script/          Google Apps Script source (Code.gs) — backend
├── public/               Static assets (PDFs, icons)
├── src/
│   ├── App.jsx           Root component, BrowserRouter, all routes
│   ├── components/
│   │   ├── AdminGuard.jsx          6-digit access code gate for /admin
│   │   ├── AdminSidebar.jsx        Admin nav with Lock button
│   │   ├── Footer.jsx              Site footer (tenant variant available)
│   │   ├── LandlordHomeLayout.jsx  Sidebar layout for the home page
│   │   ├── Navbar.jsx              Top nav (hidden on home /)
│   │   ├── PrototypeBanner.jsx     Banner shown in localStorage mode
│   │   └── ShareButton.jsx         Web Share API + clipboard fallback
│   ├── pages/
│   │   ├── Home.jsx                Landlord-facing landing page
│   │   ├── Services.jsx            Services description page
│   │   ├── Resources.jsx           Resources / links page
│   │   ├── Contact.jsx             Landlord contact form
│   │   ├── Examples.jsx            Public rental listings (tenant-facing)
│   │   ├── PublicListing.jsx       Individual listing detail + apply (tenant-facing)
│   │   ├── TenantContact.jsx       Tenant contact page
│   │   └── admin/
│   │       ├── AdminLayout.jsx     Admin shell (wraps AdminGuard)
│   │       ├── Dashboard.jsx       Admin dashboard
│   │       ├── Listings.jsx        All listings table
│   │       ├── NewListing.jsx      Create listing form
│   │       └── ListingDetail.jsx   Edit / publish listing
│   ├── styles/
│   │   └── global.css              All CSS — warm cream design system
│   ├── translations.js             EN/ZH string map
│   └── utils/
│       ├── api.js                  Apps Script fetch client (GET + POST)
│       ├── storage.js              Storage adapter (API or localStorage)
│       ├── generateContent.js      AI copy helpers
│       └── videoCache.js           Video asset cache utility
├── .env.example          Template for environment variables
├── .env.local            Local secrets — gitignored, never committed
├── vite.config.js
└── package.json
```

---

## 3. Routing Structure

All routes are defined in `src/App.jsx`. The `AppInner` component uses `useLocation` to hide the Navbar on the home page (`/`).

| Path | Component | Audience |
|---|---|---|
| `/` | `LandlordHomeLayout` → `Home` | Landlord |
| `/services` | `Services` | Landlord |
| `/resources` | `Resources` | Landlord |
| `/contact` | `Contact` | Landlord |
| `/examples` | `Examples` | Tenant (rental listings) |
| `/listings/:id` | `PublicListing` | Tenant (listing detail + apply) |
| `/tenant-contact` | `TenantContact` | Tenant |
| `/admin` | `AdminLayout` → `Dashboard` | Admin (code-protected) |
| `/admin/new` | `AdminLayout` → `NewListing` | Admin |
| `/admin/listings` | `AdminLayout` → `Listings` | Admin |
| `/admin/listing/:id` | `AdminLayout` → `ListingDetail` | Admin |
| `*` | Redirects to `/` | — |

---

## 4. Data Flow

### Live mode (Google Sheets)

```
Admin creates/edits listing in /admin
    │
    └── storage.js → api.js → POST to Apps Script Web App
                                    │
                                    └── Writes row to Google Sheet
                                         (status, address, rent, etc.)

Tenant views /examples or /listings/:id
    │
    └── storage.js → api.js → GET to Apps Script Web App
                                    │
                                    └── Reads all rows from Google Sheet
                                         → returns only status=Published rows
```

- **Cache busting:** Every GET request appends `_t=Date.now()` and uses `cache: "no-store"` to bypass Google's Apps Script GET cache.
- **Photos:** Uploaded via `uploadToSubfolder` → stored in Google Drive under the listing's folder. `getListingFolderFiles` retrieves Drive file links for display.
- **Contact form submissions:** POSTed to Apps Script → appended to a Contacts sheet.

### Prototype mode (localStorage)

When `VITE_STUDIO_EXEC_URL` is not set, `storage.js` reads/writes `vanisland_listings_v1` in the browser's `localStorage`. No network requests are made. A `PrototypeBanner` component alerts the user.

### Key environment variables

| Variable | Purpose |
|---|---|
| `VITE_STUDIO_EXEC_URL` | Apps Script deployment URL — enables live mode |
| `VITE_RENTAL_FORM_URL` | Google Form URL pre-filled for tenant applications |
| `VITE_ADMIN_ACCESS_CODE` | 6-digit code to unlock `/admin` (stored in sessionStorage) |

Set in `.env.local` for local development. Set in Netlify → Site Settings → Environment Variables for production.

---

## 5. Deployment Flow

```
Local dev
  npm run dev  →  http://localhost:5175

      │  (git commit + git push origin main)
      ▼

GitHub: mabelclaw67-hash/Landlord-AI-Marketing-studio (main branch)

      │  (Netlify watches main, auto-triggers on push)
      ▼

Netlify build:
  Build command:  npm run build
  Publish dir:    dist/
  Node version:   (default)

      │  (build succeeds → deploy to CDN)
      ▼

Live site  (Netlify-assigned URL, or custom domain if configured)
```

- Netlify handles all SPA routing via a `_redirects` rule (`/* /index.html 200`) so React Router deep links work.
- No server-side rendering. The `dist/` folder contains only static HTML, CSS, and JS.
- Apps Script is deployed separately from Google Apps Script editor and has its own versioned deployment URL.

---

## 6. User Workflows

### Admin: updating rental listings

1. Navigate to `/admin` → enter 6-digit access code.
2. Click **New Listing** to create, or **Listings** to select an existing one.
3. Fill in address, rent, bedrooms, bathrooms, available date, features, description, Drive folder link, status.
4. Set status to **Published** to make the listing visible on the public site.
5. Click **Lock Admin / 锁定** to clear the session when done.
6. Changes are written immediately to Google Sheet via Apps Script.

### Tenant: viewing and applying

1. Visit `/examples` (Rental Listings) — only Published listings appear.
2. Click **View Details / Apply →** to open the full listing at `/listings/:id`.
3. Review photos, features, and application requirements.
4. Click **Apply Now →** to open the pre-filled Google Form in a new tab, or download the PDF backup form.
5. Submit application via Google Form — responses go to Google Forms / linked Sheet.

### Tenant: sharing a listing

1. On any listing card (`/examples`) or listing detail page (`/listings/:id`), click **Share Listing**.
2. On devices that support the Web Share API (most mobile browsers), the native share sheet opens — allows sharing via Messages, WhatsApp, email, etc.
3. On desktop browsers without Web Share API support, the listing URL is copied to clipboard and a "Link copied" confirmation appears for 2 seconds.

---

## 7. Recently Changed / Created Files

| File | Change |
|---|---|
| `src/components/ShareButton.jsx` | **New.** Web Share API + clipboard fallback share button component. |
| `src/pages/Examples.jsx` | Added `ShareButton` below each rental card CTA. |
| `src/pages/PublicListing.jsx` | Added `ShareButton` below PDF download link in Apply section. |
| `src/styles/global.css` | Added `.share-btn`, `.share-btn__icon`, `.share-btn__copied`, `.share-btn--detail` styles. Also contains all landlord home (`lh-`), public page (`pub-`), tenant (`tenant-`), and admin guard CSS added in the current redesign. |
| `src/components/LandlordHomeLayout.jsx` | **New.** Sidebar layout for the home page (desktop 252px sidebar + mobile pill nav). |
| `src/pages/Home.jsx` | Rewritten as landlord-facing landing page with BC RTB compliance card. |
| `src/components/AdminGuard.jsx` | **New.** 6-digit access code gate for all `/admin` routes, backed by `sessionStorage`. |
| `src/components/AdminSidebar.jsx` | Added Lock Admin button (`lockAdmin()` from AdminGuard). |
| `src/pages/admin/AdminLayout.jsx` | Wrapped content in `<AdminGuard>`. |
| `.env.example` | Added `VITE_ADMIN_ACCESS_CODE` entry. |

---

## 8. What Must NOT Be Changed Casually

### Apps Script (`apps-script/Code.gs` + live deployment)

- The deployed Apps Script web app has a fixed URL stored in `VITE_STUDIO_EXEC_URL`. **Any re-deployment creates a new URL** — the Netlify environment variable must be updated manually if the script is redeployed.
- The Apps Script handles `doGet` (read listings) and `doPost` (write listings, contacts, upload files). Do not rename these functions or change response shapes without updating `src/utils/api.js` in tandem.
- `Content-Type: text/plain` is used intentionally on POST to avoid CORS preflight. Do not change to `application/json`.

### Google Sheet structure

- Column names in the Sheet must exactly match the field names used in `saveListing` and returned by `getListings`. Renaming a column breaks the data mapping silently.
- Do not add, remove, or reorder header columns without updating `Code.gs`.
- The `status` field value `"published"` (case-insensitive) is the gate for public visibility — do not rename the column or change the expected value.

### Netlify environment variables

- `VITE_STUDIO_EXEC_URL`, `VITE_RENTAL_FORM_URL`, and `VITE_ADMIN_ACCESS_CODE` are set in Netlify → Site Settings → Environment Variables. Changing them requires a redeploy to take effect (Vite bakes them in at build time).
- Do not commit real credentials to `.env.local` or any file tracked by git.

### Google Drive folder links

- Each listing has a Drive folder link. The `getListingFolderFiles` function extracts the folder ID from this link. Changing the folder ID format or the regex in `extractFolderId` breaks photo display.

---

## 9. Troubleshooting

### Page not updating after a code change

- If running locally: Vite HMR should auto-reload. If it doesn't, stop the dev server and run `npm run dev` again.
- If on production: confirm the `git push origin main` completed. Check the Netlify dashboard for a new deploy triggered by the push. Netlify builds typically complete in under 60 seconds.
- Hard-refresh the browser (`Cmd+Shift+R` / `Ctrl+Shift+R`) to clear the service worker or CDN cache.

### Share button not visible

- Confirm `src/components/ShareButton.jsx` exists and is imported in `Examples.jsx` and `PublicListing.jsx`.
- Check the browser console for import errors.
- The button renders for all listings, including when there is only one card — scroll down past the CTA button to find it.

### Listing data not refreshing (stale data shown)

- The Apps Script GET endpoint is aggressively cached by Google. The `_t` timestamp parameter and `cache: "no-store"` should bust this, but occasionally a hard refresh is needed.
- In Admin, after publishing a listing, wait a few seconds before checking the public `/examples` page — Apps Script propagation can take 2–5 seconds.
- If running in `localStorage` (prototype) mode, data is browser-local and won't sync across devices or tabs.

### Netlify deploy failed

1. Open Netlify dashboard → Deploys → click the failed deploy to read the build log.
2. Common causes:
   - **Missing environment variable:** Vite will not fail silently — check for `undefined` references in the log.
   - **Build error:** Run `npm run build` locally first. If it passes locally but fails on Netlify, check Node version compatibility.
   - **Out-of-date dependencies:** Run `npm install` locally and commit the updated `package-lock.json`.
3. After fixing, push a new commit to `main` to trigger a fresh deploy. Do not use "Retry deploy" if environment variables changed — those only apply to new builds.

### Admin access code not working

- The code is set via `VITE_ADMIN_ACCESS_CODE` in `.env.local` (local) or Netlify environment variables (production).
- The code is baked into the static JS bundle at build time. Changing it in Netlify requires a new deploy to take effect.
- The session is stored in `sessionStorage` — it clears when the browser tab is closed. Re-entering the code after closing the tab is expected behavior.
