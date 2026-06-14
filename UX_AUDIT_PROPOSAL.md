# UX Audit & Redesign Proposal
## Vanisland AI Marketing Studio
**Date:** 2026-06-13  
**Prepared by:** Claude Code UX Audit  
**Status:** Proposal only — no code changes made

---

## Table of Contents

1. [UX Audit Findings](#1-ux-audit-findings)
2. [Recommended Information Architecture](#2-recommended-information-architecture)
3. [Page-by-Page Improvement Plan](#3-page-by-page-improvement-plan)
4. [Wizard Workflow Proposal](#4-wizard-workflow-proposal)
5. [Files Likely to Change](#5-files-likely-to-change)
6. [Risks](#6-risks)
7. [Feature Preservation Confirmation](#7-feature-preservation-confirmation)

---

## 1. UX Audit Findings

### 1.1 Critical Issues (Fix First)

#### F-01: No "Start Here" Entry Point on Dashboard
**Current state:** `/admin` Dashboard shows KPI cards (count of Drafts, Published, etc.) but no prominent "Start New Listing" CTA. New users land on metrics for work they haven't done yet — nothing tells them what to do first.  
**Impact:** High — first-time users are immediately lost.  
**Design principle violated:** Foolproof Design (#7), One Screen One Task (#9).

#### F-02: Rental Studio Has No Guided Wizard
**Current state:** Home Sale Studio has an 11-step sequential wizard with `HomeSaleWorkflowNav.jsx` (horizontal tab bar). Rental Studio has **none** — `ListingDetail.jsx` is a single long page with all features stacked, and `NewListing.jsx` drops directly into a form without context or step indicators.  
**Impact:** High — a new user creating their first rental listing has no map of the workflow.  
**Design principle violated:** Foolproof Design (#7), Progressive Disclosure (#8), One Screen One Task (#9).

#### F-03: No "Next Recommended Step" Anywhere
**Current state:** Listing status (Draft, In Review, Ready to Publish, Published) exists in the data model but is never shown on a listing card or detail page as a call-to-action prompt. The user must know what the next step is from memory.  
**Impact:** High — users may abandon workflows mid-way.  
**Design principle violated:** Foolproof Design (#7), Important Things Stay Visible (#10).

#### F-04: Admin Sidebar Exposes Everything at Once
**Current state:** `AdminSidebar.jsx` shows all menu items expanded at all times — Dashboard, Rental Dashboard, New Rental Listing, Rental Listings, Rental Leads, Trial Requests, Home Sale Dashboard, New Sale Listing, Sale Listings, Buyer Inquiries, Photo Tips, FAQ, Settings. That is 14+ items visible simultaneously.  
**Impact:** Medium-high — overwhelming for a new user; violates progressive disclosure.  
**Design principle violated:** Progressive Disclosure (#8), Admin & User Separation (#11).

#### F-05: Two Separate Studios Feel Like Two Separate Products
**Current state:** Rental Studio and Home Sale Studio have completely different UX patterns — different navigation models, different workflow structures, different status terminologies. A user managing both types of listings must context-switch between paradigms.  
**Impact:** Medium — cognitive load doubles when using both studios.  
**Design principle violated:** Single Source of Truth (#12), Minimal Architecture (#13).

### 1.2 Moderate Issues

#### F-06: Mobile Bottom Nav is Thin
**Current state:** `MobileBottomNav.jsx` exists but the sidebar navigation (which contains the full feature tree) is desktop-first. Mobile users relying on the bottom nav get a reduced view without clear access to the full workflow.  
**Impact:** Medium — the product claims mobile-first (#5) but admin workflows are sidebar-centric.

#### F-07: Listing Status Labels Are Inconsistent Between Studios
**Current state:**
- Rental status values: `Draft | In Review | Ready to Publish | Published`
- Home Sale status values: `Draft | In Review | Ready to Publish | Published | Open House | Pending | Sold | Archived | Active`
- Home Sale has richer status but Rental doesn't surface statuses on listing cards the same way.  
**Impact:** Medium — confusing when managing both types; harder to build unified dashboard.  
**Design principle violated:** Single Source of Truth (#12).

#### F-08: "Leads" Page Is a Placeholder but Still Appears in Sidebar
**Current state:** `/admin/leads` renders a `ComingSoonSection` placeholder but the sidebar link is live. Clicking it leads to a dead end.  
**Impact:** Low-medium — erodes trust with new users who explore the sidebar.  
**Design principle violated:** Foolproof Design (#7).

#### F-09: Advanced Tools Mixed With Primary Workflow
**Current state:** On `ListingDetail.jsx` (Rental), features like Video Script, Cover Text Generator, QR Code, and AI Ad Copy are presented at the same visual weight as primary tasks. There is no hierarchy between "do this first" and "do this later."  
**Design principle violated:** Progressive Disclosure (#8), One Screen One Task (#9).

#### F-10: No Cost/Usage Visibility for Users
**Current state:** No usage dashboard, no API call counter, no token usage display. The design principles explicitly require: "Every system needs Usage Dashboard, Cost Dashboard, Budget Warning."  
**Impact:** Medium — risk of runaway costs without visibility.  
**Design principle violated:** Cost Control First (#3), Cost Visibility (#16).

### 1.3 Minor Issues

#### F-11: Bilingual Toggle is Page-Level, Not Session-Level
**Current state:** Language toggle is in the Navbar. It works, but if a user switches language mid-flow, individual pages may have partially-translated content if any label falls back to a missing key.  
**Impact:** Low-medium — the principle says "bilingual app, not bilingual page" — language mode should be set once, applied everywhere, never mixed.

#### F-12: "Trial Mode" Badge Is Visible to Trial Users in Sidebar
**Current state:** Trial users see a `[Trial: Rental Studio]` badge in the sidebar. This is useful for admin awareness but could be confusing for a trial user who expects a standard experience.  
**Impact:** Low — minor trust/polish issue.

#### F-13: Public Contact Form Exposes Phone Number
**Current state:** The `Contact.jsx` page includes a phone number field. The design principles require privacy-first and careful handling of contact exposure for trial users.  
**Impact:** Low (contact page is separate from trial flow, but worth auditing in implementation).

---

## 2. Recommended Information Architecture

### 2.1 Principle Summary Applied to IA

| Principle | IA Decision |
|-----------|-------------|
| Foolproof Design | Dashboard = "What should I do next?" not "Here are your stats" |
| Progressive Disclosure | Sidebar groups collapsed by default; Advanced Tools collapsed on listing pages |
| One Screen One Task | Each wizard step = one page, one action |
| Admin & User Separation | Admin-only items (Settings, Trial Requests) in a collapsed "System" group |
| Single Source of Truth | One "My Listings" view showing both Rental and Home Sale, filterable |
| Mobile First | Bottom nav matches sidebar primary sections |

### 2.2 New Dashboard Structure

```
┌─────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD                    [Language: EN/中] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  ➕  START A NEW LISTING                    │   │
│  │      Rental   |   Home Sale                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  MY LISTINGS                          [Filter ▼]   │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🟡 DRAFT          2 listings   [Continue →]  │  │
│  │ 🔵 IN PROGRESS    1 listing    [Next Step →] │  │
│  │ 🟢 PUBLISHED      3 listings   [View →]      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  RECOMMENDED NEXT STEP                              │
│  ┌──────────────────────────────────────────────┐  │
│  │ "123 Oak St" · Rental · Draft                │  │
│  │ 📷 Upload photos to continue                 │  │
│  │                          [Upload Photos →]   │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ADVANCED TOOLS                          [▼ Show]  │
│  (collapsed by default)                            │
│  · Assets · AI Copy · Video · Leads · Settings     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.3 New Sidebar Structure (Collapsed Groups)

```
VANISLAND STUDIO                    [🔒 Lock]

▶ MY LISTINGS                      (expanded by default)
  · All Listings (Rental + Sale)
  · + New Listing

▶ RENTAL STUDIO                    (collapsed)
  · Rental Listings
  · Rental Applications
  · Rental Leads

▶ HOME SALE STUDIO                 (collapsed)
  · Sale Listings
  · Buyer Inquiries

▶ ADVANCED TOOLS                   (collapsed)
  · Daily Market Brief
  · Photo Tips
  · FAQ
  · Resources

▶ SYSTEM                           (collapsed, admin-only items)
  · Settings
  · Trial Requests
  · Usage & Costs
```

### 2.4 Unified Listing Status Flow (Both Studios)

```
  ① Draft
      ↓  (photos added)
  ② Photos Uploaded
      ↓  (AI enhanced)
  ③ Photos Enhanced
      ↓  (copy generated)
  ④ Copy Generated
      ↓  (video ready)
  ⑤ Video Ready
      ↓  (manual review)
  ⑥ Ready to Publish
      ↓  (publish action)
  ⑦ Published
      ↓  (leads coming in)
  ⑧ Active / Managing Leads
```

*Note: Home Sale has additional states (Open House, Pending, Sold) that appear after Published. These are additive — they don't conflict with the base flow above.*

### 2.5 "Next Recommended Step" Logic

| Current Status | Next Step Prompt | CTA Button Label |
|----------------|-----------------|-----------------|
| Draft | "Add property details to continue" | Add Details |
| Draft (details done, no photos) | "Upload photos to continue" | Upload Photos |
| Photos Uploaded | "Enhance photos with AI" | Enhance Photos |
| Photos Enhanced | "Generate listing copy" | Generate Copy |
| Copy Generated | "Create video or skip to review" | Create Video / Skip |
| Video Ready | "Review your listing" | Review Listing |
| Ready to Publish | "Your listing is ready — publish now" | Publish Now |
| Published | "Monitor leads and applicants" | View Leads |

---

## 3. Page-by-Page Improvement Plan

### 3.1 Admin Dashboard (`src/pages/admin/Dashboard.jsx`)

**Current problems:** KPI-first layout; no onboarding CTA; no per-listing next step.  
**Proposed changes:**
- Add **"Start New Listing" hero section** at top — two buttons: "Rental Listing" and "Home Sale Listing"
- Replace or supplement KPI row with **status-grouped listing cards** (Draft, In Progress, Published)
- Add **"Recommended Next Step" card** — shows the highest-priority listing action (oldest draft or most recently active listing)
- Keep existing KPI numbers but move them to a collapsible "Stats" section below
- Add **"Advanced Tools" collapsed section** at bottom of dashboard

**Empty state:** If user has no listings, show: "You don't have any listings yet. Start your first one →"

---

### 3.2 Admin Sidebar (`src/components/AdminSidebar.jsx`)

**Current problems:** 14+ items visible at once; no grouping by priority; admin-only items mixed with workflow items.  
**Proposed changes:**
- Restructure into **5 collapsible groups** (see IA 2.3 above)
- **"My Listings"** group expanded by default; all others collapsed
- **"System"** group collapsed and visually de-emphasized (smaller text, no icon weight)
- Hide "Leads" link until feature is ready (or show with `[Coming Soon]` chip, not as live link)
- Hide "Trial Requests" from Trial users (already partially done, strengthen)
- On mobile: mirror the same 5 groups in `MobileBottomNav.jsx` as tab icons

---

### 3.3 Mobile Bottom Nav (`src/components/MobileBottomNav.jsx`)

**Current problems:** Thin coverage; sidebar-centric workflows are hard to reach on mobile.  
**Proposed changes:**
- 5 tabs matching sidebar groups:
  1. 🏠 Dashboard
  2. 📋 My Listings
  3. ➕ New Listing (center, prominent)
  4. 🔔 Leads / Applicants
  5. ⚙️ More (expands: Studio, Resources, System)
- Each tab maps to a route, not a sidebar group name
- "New Listing" center button uses accent color (visual hierarchy)

---

### 3.4 New Rental Listing (`src/pages/admin/NewListing.jsx`)

**Current problems:** Drops user into a form with no step context; no wizard progress indicator.  
**Proposed changes:**
- Add **step progress indicator** at the top (similar to `HomeSaleWorkflowNav.jsx` but for Rental):
  ```
  Step 1 of 10: Property Details
  ① Details → ② Photos → ③ Enhance → ④ Cover → ⑤ Copy → ⑥ Video → ⑦ Review → ⑧ Publish → ⑨ Applications → ⑩ Leads
  ```
- Keep the existing form fields — only add the navigator above
- Add helper text below the page title: "Start by entering your property's basic details. You can save and continue later."
- Add "Save & Continue" button (not just "Save")

---

### 3.5 Rental Listing Detail (`src/pages/admin/ListingDetail.jsx`)

**Current problems:** All tools on one long page; no status indicator; no "next step" prompt.  
**Proposed changes:**
- Add **status badge + next step banner** at the very top of the page:
  ```
  Status: [Photos Uploaded]  →  Next: Generate Listing Copy  [Generate Copy →]
  ```
- Reorganize page sections into **collapsible module cards** with visual priority:
  - **Primary card** (always open): Current step in workflow
  - **Secondary cards** (collapsed): Completed steps — show summary + "Edit" link
  - **Advanced cards** (collapsed by default): QR code, Share Kit, Settings
- Add **step-by-step sidebar/panel** (reuse or adapt `RentalApplicationProcessPanel.jsx` concept) to show where the listing is in the 10-step flow
- Keep all existing buttons/forms — only restructure their visual grouping and collapse state

---

### 3.6 Rental Listings List (`src/pages/admin/Listings.jsx`)

**Current problems:** Table view only; no status-based visual grouping; no per-row "next step."  
**Proposed changes:**
- Add **status filter tabs** at top: All | Draft | In Progress | Published
- Each listing row/card shows: Address · Status badge · "Next step" chip · CTA button
- On mobile: switch from table to **card view** (one card per listing, large tap targets)
- Keep existing table for desktop view — add a card toggle for mobile

---

### 3.7 Home Sale Dashboard (`src/pages/admin/HomeSaleAdmin.jsx`)

**Current problems:** Separate dashboard from main Dashboard; creates a two-dashboard problem.  
**Proposed changes (option A — preferred):** Fold Home Sale KPIs into the unified Dashboard (3.1 above) rather than keeping a separate dashboard. The unified "My Listings" view shows both Rental and Home Sale listings, filterable by type.  
**Proposed changes (option B — safer):** Keep HomeSaleAdmin.jsx as-is but add "← Back to Dashboard" breadcrumb and remove duplicate navigation elements.

*Recommendation: Option A for long-term UX simplicity. Option B as a lower-risk interim step.*

---

### 3.8 Home Sale Listing Detail Workflow (11-step Wizard)
**Files:** `HomeSaleWorkflowNav.jsx`, all `HomeSale*.jsx` pages

**Current state:** Already the best UX in the app — sequential steps, horizontal tab nav, clear workflow.  
**Proposed changes (minor polish only):**
- Add **"Next Step" floating button** at the bottom of each step page (in addition to the nav tabs)
- Add **completion indicators** on each tab (✓ green checkmark when step is done, status color for in-progress)
- Add **estimated time / helper text** at the top of each step (e.g., "Step 2 of 11 · Upload original photos · ~5 min")
- For the `HomeSaleListings.jsx` list view: apply same card-view + status filter improvement as Rental (3.6)

---

### 3.9 Admin Settings (`src/pages/admin/AdminSettings.jsx`)

**Current state:** Live in the sidebar as a top-level item.  
**Proposed changes:** Move to the collapsed "System" group in the sidebar. No functional changes.

---

### 3.10 Rental Leads (`src/pages/admin/Leads.jsx`)

**Current state:** Shows `ComingSoonSection` but has a live sidebar link.  
**Proposed changes:** Either:
- (A) Hide the sidebar link entirely until feature is ready
- (B) Show the link with a `[Coming Soon]` badge chip that is styled as non-clickable

Recommended: Option (B) — preserves discoverability while setting honest expectations.

---

### 3.11 Trial Access Gate / Onboarding (`src/pages/TrialAccess.jsx`)

**Current state:** Users request trial access on `/trial-access`, then wait for admin approval. After approval they enter admin with a trial badge. But there is no "welcome" or "start here" screen post-approval.  
**Proposed changes:**
- Add a **"Welcome, trial user!" onboarding screen** that appears once after first admin login
- Shows the 10-step Rental workflow (or 11-step Home Sale workflow) as a visual map
- "Start your first listing →" CTA
- One-time dismissible (don't show again after first close)
- No new page needed — can be a modal overlay on Dashboard

---

### 3.12 Usage & Cost Dashboard (New, Currently Missing)

**Current state:** No cost visibility exists anywhere. This is a critical gap per design principles.  
**Proposed addition:** A new "Usage & Costs" item in the System sidebar group (admin-only), pointing to a page that shows:
- Total API calls (by type: AI copy, photo enhancement, video generation)
- Token count (if using LLM APIs)
- Estimated cost this month vs. budget
- Per-listing cost breakdown
- Budget warning thresholds (yellow/red)

*This is a new feature — but it is a design-principle requirement (#3, #16), not a UX addition. Flagged here as an audit finding, not a redesign item.*

---

## 4. Wizard Workflow Proposal

### 4.1 Current State of Wizards

| Studio | Wizard Exists? | Nav Type | Steps |
|--------|---------------|----------|-------|
| Home Sale | ✅ Yes | `HomeSaleWorkflowNav.jsx` horizontal tabs | 11 steps |
| Rental | ❌ No | None — single long detail page | Implicit only |

### 4.2 Rental Studio Wizard — Proposed Steps

**Route pattern:** `/admin/listing/:id` with step parameter: `/admin/listing/:id?step=photos`

```
STEP 1: Property Details       /admin/listing/:id?step=details
  ↳ Form: address, rent, bedrooms, bathrooms, available date, features
  ↳ Helper: "Enter the basics. You can edit these at any time."
  ↳ Next: "Save & Go to Photos →"

STEP 2: Upload Photos          /admin/listing/:id?step=photos
  ↳ Action: upload photos to Google Drive / storage
  ↳ Helper: "Upload 5–15 photos. See our Photo Tips for best results."
  ↳ Next: "Go to Photo Enhancement →"

STEP 3: Enhance Photos (AI)    /admin/listing/:id?step=enhance
  ↳ Action: AI enhancement of uploaded photos
  ↳ Helper: "Let AI improve lighting and sharpness."
  ↳ Next: "Choose Cover Image →"

STEP 4: Cover Image            /admin/listing/:id?step=cover
  ↳ Action: select or generate cover image with text overlay
  ↳ Helper: "This is the first image tenants will see."
  ↳ Next: "Generate Listing Copy →"

STEP 5: Generate Listing Copy  /admin/listing/:id?step=copy
  ↳ Action: AI-generated ad copy (EN + ZH), Facebook post, Craigslist post
  ↳ Helper: "AI will write your listing description in English and Chinese."
  ↳ Next: "Create Video Script →" or [Skip to Review]

STEP 6: Video Script & Audio   /admin/listing/:id?step=video
  ↳ Action: generate video script + upload/generate video + music
  ↳ Helper: "Optional but recommended for higher engagement."
  ↳ Next: [Skip] or "Review Listing →"

STEP 7: Review Draft           /admin/listing/:id?step=review
  ↳ Action: preview public listing page
  ↳ Checklist: Photos ✓ | Cover ✓ | Copy EN ✓ | Copy ZH ✓ | Video (optional)
  ↳ Next: "Publish Listing →"

STEP 8: Publish                /admin/listing/:id?step=publish
  ↳ Action: set status to Published, generate QR code, generate share kit
  ↳ Helper: "Your listing will be live at [url]. Share the QR code on WeChat, Facebook, and Craigslist."
  ↳ Next: "View Live Listing →" or "Share Now →"

STEP 9: Manage Applications    /admin/listing/:id?step=applications
  ↳ View: incoming rental applications list
  ↳ Action: review each applicant, approve/reject, request support docs
  ↳ Helper: "Review applicants here. Approved applicants will be notified."
  ↳ Next: ongoing — "View All Applications"

STEP 10: Manage Leads          /admin/listing/:id?step=leads
  ↳ View: CRM leads (future feature)
  ↳ Currently: "Coming Soon" — show with Coming Soon chip, not dead page
```

**Visual nav component:** Mirror `HomeSaleWorkflowNav.jsx` for Rental, with 10 tabs.

**Step completion detection:** A step is "complete" when its key data field is non-null:
- Step 1: `listing.address && listing.rent` → complete
- Step 2: `listing.photos.length > 0` → complete
- Step 3: `listing.photos` have been enhanced (flag/timestamp) → complete
- Step 4: `listing.coverPhotoUrl` → complete
- Step 5: `listing.adCopyEn && listing.adCopyCh` → complete
- Step 6: `listing.videoUrl` → complete (or explicitly skipped)
- Step 7: manual review (button click) → complete
- Step 8: `listing.status === 'Published'` → complete

### 4.3 Wizard Implementation Approach

**Option A (Recommended): Step-Based URL Params**
- Keep existing `ListingDetail.jsx` but add a step-awareness layer at the top
- URL param `?step=photos` controls which section is focused/expanded
- All sections still accessible (by scrolling or clicking tabs)
- No breaking changes to existing functionality

**Option B: Separate Step Pages (Like Home Sale)**
- Create `/admin/listing/:id/photos`, `/admin/listing/:id/copy`, etc.
- More work to implement but cleaner one-screen-one-task UX
- Matches the Home Sale pattern exactly

**Option C: Overlay Wizard on First Visit**
- Modal-style wizard the first time a user creates a listing
- Guides through steps, but all content still on the same `ListingDetail.jsx`
- Least code change but weakest UX (modals are harder on mobile)

*Recommendation: Option A for Rental (fastest, least risk), with Option B as a future iteration. Home Sale already uses Option B.*

### 4.4 Bilingual Wizard Labels

All wizard step labels must be available in both English and Chinese via `adminLabels.js`.

| Step | English Label | Chinese Label |
|------|--------------|---------------|
| 1 | Property Details | 房源信息 |
| 2 | Upload Photos | 上传照片 |
| 3 | Enhance Photos | AI 照片优化 |
| 4 | Cover Image | 封面图片 |
| 5 | Listing Copy | 文案生成 |
| 6 | Video Script | 视频脚本 |
| 7 | Review Draft | 预览草稿 |
| 8 | Publish | 发布 |
| 9 | Applications | 申请管理 |
| 10 | Leads | 潜在客户 |

---

## 5. Files Likely to Change

### 5.1 High Priority (Dashboard + Navigation — Foundation of New UX)

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/admin/Dashboard.jsx` | Major edit | Add "Start New Listing" hero, status-grouped listing cards, "Next Step" card, collapse Advanced Tools |
| `src/components/AdminSidebar.jsx` | Major edit | Restructure into 5 collapsible groups, move admin-only items to System group |
| `src/components/MobileBottomNav.jsx` | Medium edit | 5 tabs matching new sidebar groups; center "New Listing" button |

### 5.2 Medium Priority (Rental Workflow — New Wizard)

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/admin/ListingDetail.jsx` | Major edit | Add step nav (new component), status banner, collapsible section cards, "next step" prompt |
| `src/pages/admin/NewListing.jsx` | Medium edit | Add step indicator at top, "Save & Continue" flow |
| `src/pages/admin/Listings.jsx` | Medium edit | Add status filter tabs, mobile card view |
| `src/components/AdminSidebar.jsx` | (same as above) | |

### 5.3 New Components to Create

| New File | Purpose |
|----------|---------|
| `src/components/RentalWorkflowNav.jsx` | Step tabs for Rental listing (mirrors `HomeSaleWorkflowNav.jsx`) |
| `src/components/ListingStatusBanner.jsx` | Reusable banner showing status + next step CTA (used on both Rental and Home Sale detail pages) |
| `src/components/ListingCard.jsx` | Reusable card for listing list views (status badge, next step chip, CTA button) |
| `src/components/WelcomeModal.jsx` | One-time onboarding modal for new/trial users |
| `src/components/CollapsibleCard.jsx` | Reusable collapsible module card wrapper |

### 5.4 Lower Priority (Polish)

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/admin/HomeSaleAdmin.jsx` | Minor or deprecate | Fold into unified Dashboard, or add breadcrumb back |
| `src/components/HomeSaleWorkflowNav.jsx` | Minor edit | Add completion checkmarks per step, "Next Step" floating button |
| `src/pages/admin/Leads.jsx` | Minor edit | Replace live link in sidebar with "Coming Soon" chip, or hide link |
| `src/utils/adminLabels.js` | Medium edit | Add wizard step labels in EN + ZH for Rental workflow |

### 5.5 Files That Should NOT Change

These files are working correctly and should be left alone:

- `src/utils/storage.js` — CRUD logic is correct
- `src/utils/homeSaleSheet.js` — Sheet API is correct
- `src/utils/api.js` — HTTP client is correct
- `src/utils/trialAccess.js` — Trial logic is correct (already handles contact privacy)
- `src/pages/admin/HomeSaleListingForm.jsx` — Form works well
- All `HomeSale*.jsx` workflow step pages — Already have wizard structure
- `src/pages/RentalApplication.jsx` — Tenant-facing multi-step form already works
- `src/pages/admin/ApplicationReview.jsx` — Application review workflow works
- `src/utils/generateContent.js` — AI generation logic
- `src/utils/rentalApplicationPdf.js` — PDF generation
- All public pages — `PublicListing.jsx`, `HomeSaleListingDetail.jsx`, etc.
- `src/contexts/LangContext.jsx` — Language context works correctly

---

## 6. Risks

### R-01: Rental Wizard Breaks Existing Bookmarks / Deep Links
**Risk:** If the Rental wizard uses URL step params (`?step=photos`), existing bookmarks or direct links to `ListingDetail.jsx` may land on a different default step.  
**Mitigation:** Default to step=1 (Details) for new listings, and the last-visited step for existing listings (persist in localStorage). Do not remove any existing routes.  
**Severity:** Low.

### R-02: Dashboard Consolidation May Break Home Sale Navigation
**Risk:** If `HomeSaleAdmin.jsx` is folded into the main Dashboard, any links in the admin sidebar pointing to `/admin/home-sale` must be updated.  
**Mitigation:** Use Option B for the first iteration (add breadcrumb, keep separate dashboard) until the unified view is fully tested.  
**Severity:** Low.

### R-03: Sidebar Collapse State May Confuse Returning Users
**Risk:** If the sidebar collapses all groups by default, a user who relied on always-visible "Rental Listings" link will need to re-expand.  
**Mitigation:** Remember collapse state per group in localStorage. "My Listings" is always expanded by default. Keep keyboard/ARIA accessibility on accordions.  
**Severity:** Low.

### R-04: Step Detection Logic May Be Inaccurate
**Risk:** "Next recommended step" requires checking data fields to determine completion. If a listing has adCopyEn but no photos, the logic may show the wrong next step.  
**Mitigation:** Define a strict ordered priority — steps must be checked in sequence (Step 1 → 2 → 3...), and the first incomplete step wins. Don't try to infer from multiple fields simultaneously.  
**Severity:** Low-Medium.

### R-05: Mobile Card View Requires Responsive Redesign of Listings Pages
**Risk:** `Listings.jsx` and `HomeSaleListings.jsx` are currently table-based. Switching to card view on mobile requires CSS breakpoint work and possibly separate rendering branches.  
**Mitigation:** Use CSS `@media` queries — render table on `md:` and above, card grid below. React component stays the same; only layout changes.  
**Severity:** Low.

### R-06: "Usage & Cost Dashboard" Requires Backend Work
**Risk:** The audit found no cost tracking exists. Adding it requires API instrumentation (logging each call, token count, estimated cost) on the Apps Script backend before the frontend can display it.  
**Mitigation:** Scope this as a separate phase. For now, add the "Usage & Costs" sidebar link with a "Coming Soon" chip, and build the backend tracking first.  
**Severity:** Medium (for the cost dashboard feature). Does not block other UX changes.

### R-07: Bilingual Completeness for New Labels
**Risk:** Adding new wizard step labels, banners, and helper text in `adminLabels.js` requires complete EN + ZH translations for all new strings. Missing translations will show empty text or fall back to English in Chinese mode.  
**Mitigation:** All new labels must be added as key-value pairs in both `AL.en` and `AL.zh` before deployment. Include a translation review in the PR checklist.  
**Severity:** Low-Medium.

### R-08: Welcome Modal Must Not Appear for Admin (Only Trial Users + New Users)
**Risk:** If the onboarding welcome modal fires for the existing admin user (Mabel), it will be annoying.  
**Mitigation:** Set a localStorage key `onboarding_seen` after first dismissal. Never show if in full admin mode (as opposed to trial mode). Check the flag on Dashboard mount.  
**Severity:** Low.

---

## 7. Feature Preservation Confirmation

**Commitment: No features will be removed.** This UX redesign reorganizes and surfaces existing features — it does not delete, disable, or hide any functionality that currently works.

The table below confirms every major feature is preserved:

| Feature | Current Location | After Redesign |
|---------|-----------------|----------------|
| Create rental listing | `/admin/new` sidebar link | "Start New Listing → Rental" button on Dashboard + sidebar |
| Create home sale listing | `/admin/home-sale` sidebar link | "Start New Listing → Home Sale" button on Dashboard + sidebar |
| View all rental listings | `/admin/listings` | "My Listings" dashboard section + sidebar (collapsed group) |
| View all sale listings | `/admin/home-sale/listings` | "My Listings" dashboard section + sidebar (collapsed group) |
| Generate AI copy (rental) | `ListingDetail.jsx` section | Same page — in collapsible "Generate Copy" card |
| Generate AI copy (sale) | `HomeSaleMarketing.jsx` | Unchanged |
| Photo upload (rental) | `ListingDetail.jsx` section | Same page — in collapsible "Photos" card |
| Photo upload (sale) | `HomeSaleMedia.jsx` | Unchanged |
| Photo enhancement | `HomeSalePhotoEnhance.jsx` | Unchanged |
| Virtual staging | `HomeSaleVirtualStaging.jsx` | Unchanged |
| Cover image (rental) | `ListingDetail.jsx` section | Same page — in collapsible "Cover Image" card |
| Cover image (sale) | `HomeSaleCoverImage.jsx` | Unchanged |
| Video script (rental) | `ListingDetail.jsx` section | Same page — in collapsible "Video" card |
| Video script (sale) | `HomeSaleVideo.jsx` | Unchanged |
| QR code generation | `ListingDetail.jsx` + `HomeSaleShare.jsx` | Same — moved to "Share Kit" collapsible card on rental |
| Publish listing | `ListingDetail.jsx` | Same — surfaced more prominently in Step 8 of wizard |
| Rental application form | `/apply/:listingId` | Unchanged — public tenant-facing page |
| Application review | `/admin/application/:applicationId` | Unchanged — accessible from Applications step in wizard |
| Support documents | `/support-documents/:listingId/:recordId` | Unchanged |
| Buyer inquiries (sale) | `HomeSaleBuyerInquiry.jsx` | Unchanged |
| QR + share kit (sale) | `HomeSaleShare.jsx` | Unchanged |
| Open house (sale) | `HomeSaleOpenHouse.jsx` | Unchanged |
| Review & Publish (sale) | `HomeSaleReviewPublish.jsx` | Unchanged |
| Daily market brief | `/reports/daily-market-brief` | Unchanged — in Advanced Tools sidebar group |
| Photo tips | `/admin/photo-tips` | Unchanged — in Advanced Tools sidebar group |
| FAQ | `/admin/faq` | Unchanged — in Advanced Tools sidebar group |
| Trial requests | `/admin/trial-requests` | Unchanged — in System sidebar group (admin-only) |
| Admin settings | `/admin/settings` | Unchanged — in System sidebar group |
| Trial access gate | `TrialAccessGate.jsx` | Unchanged |
| Bilingual toggle | `Navbar.jsx` | Unchanged — also visible in mobile header |
| Public listing pages | `/listings/:id` + `/home-sale-studio/listings/:id` | Unchanged |
| Contact form | `/contact` | Unchanged |
| Resources page | `/resources` | Unchanged |
| Daily brief report | `/reports/daily-market-brief` | Unchanged |
| PDF generation | `rentalApplicationPdf.js` | Unchanged |
| localStorage fallback | `storage.js` | Unchanged |

---

## Appendix: Design Principles Compliance Checklist

| Principle | Current State | After Proposal |
|-----------|--------------|----------------|
| 1. Privacy & Data Security First | ✅ Trial users see no admin contact info; access codes via env | ✅ No changes to privacy model |
| 2. Legal & Compliance First | ✅ BC law resources, disclosure, application privacy | ✅ Unchanged |
| 3. Cost Control First | ❌ No usage/cost dashboard exists | ⚠️ Flagged as R-06; flagged for Phase 2 |
| 4. User Value First | ✅ Solves real problem | ✅ Better surfaced with guided workflow |
| 5. Mobile First | ⚠️ MobileBottomNav exists but limited | ✅ New bottom nav + card views |
| 6. Bilingual App, Not Page | ✅ Full EN/ZH toggle | ✅ All new labels added to adminLabels.js |
| 7. Foolproof Design | ❌ No "Start Here," no next step prompts | ✅ Dashboard CTA + status banners + wizard |
| 8. Progressive Disclosure | ❌ Sidebar + detail pages show everything | ✅ Collapsible sidebar groups + module cards |
| 9. One Screen, One Task | ❌ ListingDetail.jsx stacks all features | ✅ Wizard steps + collapsible cards |
| 10. Important Things Stay Visible | ❌ Status + next step buried | ✅ Status banner + "Next Step" card on dashboard |
| 11. Admin & User Separation | ✅ AdminGuard, trial gating | ✅ System group hidden in collapsed sidebar |
| 12. Single Source of Truth | ⚠️ Two separate dashboards | ✅ Unified "My Listings" view |
| 13. Minimal Architecture | ✅ Clean SPA, no over-engineering | ✅ 5 new components only |
| 14. Automation Reduces Work | ✅ AI generates copy/video | ✅ Unchanged |
| 15. Human Confirmation Required | ✅ All AI output requires review before publish | ✅ Unchanged |
| 16. Cost Visibility | ❌ None | ⚠️ Flagged, deferred to Phase 2 |
| 17. Documentation Mandatory | ⚠️ docs/ exists, contents not fully audited | — |
| 18. Real Users Before More Features | — | ✅ This proposal improves UX for existing features |
| 19. AI Is a Tool | ✅ AI assists, human confirms | ✅ Unchanged |
| 20. Build Systems That Can Run Without You | ✅ localStorage fallback, Apps Script | ✅ Unchanged |

---

## Implementation Order (Suggested Phases)

### Phase 1: Dashboard + Navigation (1–2 days)
- Dashboard "Start New Listing" hero button
- Status-grouped listing cards (Rental + Home Sale)
- "Next Step" logic + card
- Sidebar 5-group collapse structure

### Phase 2: Rental Wizard (2–3 days)
- `RentalWorkflowNav.jsx` component
- Add to `ListingDetail.jsx` as step-param driven nav
- `ListingStatusBanner.jsx` with next step CTA
- `CollapsibleCard.jsx` wrapper for all detail sections

### Phase 3: Mobile Polish (1 day)
- `MobileBottomNav.jsx` 5-tab redesign
- Card view for `Listings.jsx` and `HomeSaleListings.jsx`

### Phase 4: Home Sale Wizard Polish (1 day)
- Completion checkmarks on `HomeSaleWorkflowNav.jsx`
- "Next Step" floating button on each step page

### Phase 5: Welcome Onboarding (1 day)
- `WelcomeModal.jsx` one-time welcome for trial/new users
- `onboarding_seen` localStorage flag

### Phase 6: Cost Dashboard (separate sprint — requires backend work first)
- Apps Script instrumentation for API call logging
- Frontend "Usage & Costs" page under System group

---

*End of UX Audit & Redesign Proposal*  
*Document saved: `UX_AUDIT_PROPOSAL.md`*  
*No code was modified in the production codebase.*
