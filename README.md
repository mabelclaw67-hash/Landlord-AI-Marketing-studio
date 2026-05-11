# Landlord AI Marketing Studio — v0.1 Prototype
### 房东 AI 广告工作台 — v0.1 原型

AI Rental Listing Marketing Studio — Create bilingual rental ads, listing cover text, and short video scripts for BC landlords.

AI 房源广告生成平台 — 为华人房东快速生成中英文出租广告、封面文案和短视频素材。

---

## How to Run Locally

```bash
npm install
npm run dev
```

Then open: http://localhost:5173

---

## v0.1 — What's Implemented

**Public Site (5 pages):**
- Home — hero, service overview, beta notice, compliance notice
- Services — 4 service descriptions (bilingual)
- Examples — 3 sample property marketing cards with ad preview
- Resources — 4 BC landlord compliance resource cards
- Contact / Beta — bilingual form with local success message (no backend)

**Admin Studio (4 views):**
- Dashboard — KPI cards (Draft / In Review / Ready / Published), listing table
- New Listing — full property intake form, generates template-based marketing copy
- Listing Detail — platform output tabs, copy button, review status, compliance flag, media checklist
- Listings — full listing table view

**Features:**
- Full bilingual EN/中文 language switching (no external library)
- localStorage persistence with a storage adapter (ready to swap in v0.2)
- Template-based content generator for 7 output types
- Prototype warning banner on all admin pages
- Mobile responsive layout

---

## v0.1 Intentional Limitations

- **No backend** — all data lives in localStorage only
- **No AI API** — content is generated from templates, not Claude or GPT
- **No login / auth** — admin is open (prototype only)
- **No payment / Stripe**
- **No real file uploads** — media checklist is manual checkboxes
- **No Google Sheet / Drive integration**
- **No i18next** — simple translations.js object used instead
- **Contact form** — UI only, no data is transmitted anywhere

---

## Next Steps: v0.2 — Google Sheet Integration

- Replace localStorage with Google Sheets API via the storage adapter in src/utils/storage.js
- Connect Google Drive for photo uploads
- Add Google Apps Script webhook for contact form submissions
- Add basic password protection for Admin Studio

## Next Steps: v0.3 — AI Copy Generator

- Integrate Claude API (claude-sonnet-4-6) to replace template generator in src/utils/generateContent.js
- Add prompt caching for repeated property types
- Add tone / style selector (formal, friendly, urgent)
- Add one-click regenerate per platform

---

## Tech Stack

- Vite + React
- React Router v6
- Plain CSS (no framework)
- localStorage (prototype persistence)

---

## Content Compliance

All AI-generated content must be reviewed before publishing.
If images are AI-enhanced or virtually staged, this must be clearly disclosed.

所有 AI 生成内容发布前必须人工审核。若使用 AI 美化或虚拟布置图片，必须明确标注。

---

Built for Vanisland Property Management — BC, Canada
