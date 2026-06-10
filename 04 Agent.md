{\rtf1\ansi\ansicpg1252\cocoartf2870
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # AGENTS.md \'97 Landlord AI Marketing Studio\
\
## Project Role\
This project is the rental and landlord marketing workspace for Vanisland Property Management.\
\
It supports rental listings, property photos, generated ads, intake records, leads, and public rental pages.\
\
## Core Business Rules\
- Public rental pages should default to English.\
- Chinese may be available where needed.\
- Tenant-facing contact should use:\
  - Email: mabelclaw67@gmail.com\
  - Phone: 672-514-8866\
- Landlord/client business inquiry flow must remain separate from tenant rental inquiry flow.\
- Do not mix tenant inquiries with landlord/client inquiries.\
- Do not duplicate listing, asset, or lead data tables unless explicitly approved.\
\
## Path Rules\
- Work only inside this project folder:\
  `/Users/mabelchen/Mabel Project/04_landlord-ai-marketing-studio`\
- Do not create new project folders.\
- Do not create temp/build/output folders unless explicitly approved.\
- Do not save files outside this folder.\
- Before editing, report exact files to be changed.\
- After editing, report exact modified files.\
\
## Editing Rules\
- Preserve existing database structure.\
- Preserve existing listing and asset flow.\
- Do not break photo/video display.\
- Do not break Cloudinary or media links.\
- Do not change Netlify deployment settings unless explicitly requested.\
- Prefer simple UI improvements over full redesign.\
- Keep mobile-first rental pages clean and fast.\
\
## Testing Rules\
After changes, verify:\
1. Homepage loads.\
2. Listing pages load.\
3. Images display.\
4. Contact forms or buttons still work.\
5. Mobile layout is not cut off.\
6. No unrelated pages are broken.\
\
## Git Rules\
Before push:\
1. Show changed files.\
2. Confirm no unrelated files changed.\
3. Provide commit message.\
4. Remind Mabel to check Netlify deployment after push.}