# Legacy Notice

This Apps Script README is a legacy reference. The current system has both rental backend and home sale backend.

- `apps-script/Code.gs` = rental/listing/application/contact/daily brief/Cloudinary backend
- `apps-script/HomeSaleStudioRead.gs` = home sale listing/media/marketing/video/buyer inquiry backend

---

# Apps Script Deployment — Vanisland AI Studio v0.2

## Prerequisites
- Access to the Google Spreadsheet: `1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4`
- Access to the Drive folder: `1RNF_WZWsDECSnIqnaZuXWsbUy-xtmE2r`

## Steps

1. Open the spreadsheet → **Extensions → Apps Script**
2. Delete the default `myFunction` stub
3. Paste the full contents of `Code.gs` into the editor
4. Click **Save** (floppy disk icon)
5. Click **Deploy → New deployment**
6. Type: **Web app**
7. Description: `Vanisland Studio v0.2`
8. Execute as: **Me**
9. Who has access: **Anyone**
10. Click **Deploy** → copy the **Web app URL**

## Configure the frontend

Create a `.env.local` file in the project root (next to `package.json`):

```
VITE_STUDIO_EXEC_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Restart the dev server (`npm run dev`) after adding the variable.

## Redeploying after code changes

Every time you edit `Code.gs` you must create a **new deployment version**:
1. Deploy → **Manage deployments**
2. Click the pencil icon on your deployment
3. Version → **New version**
4. Click **Deploy**
5. The URL stays the same — no frontend change needed.

## Sheets created automatically

| Sheet | Purpose |
|-------|---------|
| Listings | One row per listing with all fields + generated outputs as JSON |
| Contacts | One row per contact form submission |

Drive photos are uploaded to a subfolder inside `1RNF_WZWsDECSnIqnaZuXWsbUy-xtmE2r`, named after the Listing ID.

## Troubleshooting

- **CORS error in browser console**: Make sure "Who has access" is set to "Anyone" (not "Anyone with Google account").
- **"Exception: You do not have permission"**: Re-authorize the script — click Run on any function in the editor and accept the OAuth prompt.
- **POST returns HTML instead of JSON**: The deployment URL was not updated after a code change. Redeploy.

## AI Dispute Review (`DisputeReview.gs`)

Additive module. It never touches the Property Strategy Assessment spreadsheet,
and dispute evidence is stored only under `07 AI Dispute Review` — never in a
property listing folder.

| Resource | ID / Link |
|----------|-----------|
| Folder `07 AI Dispute Review` | [1iIMToPAg8EBjiWs-fprXBZW_tpycJ000](https://drive.google.com/drive/folders/1iIMToPAg8EBjiWs-fprXBZW_tpycJ000) |
| Spreadsheet `AI Dispute Review - Data Tables` | [1Vf19MSfp73g3h-nJg8cCDRwPuoFHMLRMkWMCj7gTZ90](https://docs.google.com/spreadsheets/d/1Vf19MSfp73g3h-nJg8cCDRwPuoFHMLRMkWMCj7gTZ90/edit) |
| Evidence folder `Dispute Files` | [1-HGl9Y7g2BfZ6y3XbqXoU05hB7j30l91](https://drive.google.com/drive/folders/1-HGl9Y7g2BfZ6y3XbqXoU05hB7j30l91) |
| Report folder `Dispute Reports` | [1uE6oyIGmgzsQggv6W6Jg3DQ6srruYlQc](https://drive.google.com/drive/folders/1uE6oyIGmgzsQggv6W6Jg3DQ6srruYlQc) |

### The spreadsheet is the single source of truth

The six sheets already exist and were authored by hand. **This code never
creates, renames, reorders or deletes a sheet, a header, or a reference row.**
Every write resolves its target column by reading the live header row first, so
a column the code does not recognise keeps its value.

Run `verifyDisputeSchema()` (or POST `action=verifyDisputeSchema` as admin) to
confirm the live headers still contain every column the backend writes. It is
read-only and returns `{ ok, problems, disputeReviewColumns, disputeFileColumns }`.

There is no provisioning function — adding one back would risk appending headers
to the hand-authored reference sheets.

### Sheets

| Sheet | Purpose |
|-------|---------|
| `Dispute_Reviews` | 57 columns. The single main record. RTB / CRT / Strata / Small Claims are values of `Dispute Type`, not separate tables. |
| `Dispute_Files` | 18 columns. One row per uploaded document, keyed to `Review ID`. |
| `Form_Fields` | Intake field spec. Follow-up question IDs in the frontend use these exact `Field Key` values. |
| `Report_Sections` | The 15 report sections; the frontend uses these exact EN/ZH titles. |
| `Dropdown_Options` | Central option lists. The frontend only ever stores a value that appears here. |
| `Development_Notes` | Architecture decisions. |

### Actions

Public (no auth, same posture as the existing intake endpoints):
`startDisputeReview`, `uploadDisputeFile`, `deleteDisputeFile`, `submitDisputeReview`.

Admin only: `getDisputeReviews`, `getDisputeReview`,
`updateDisputeProfessionalReview`, `generateDisputeReport`, `verifyDisputeSchema`.

### Bilingual report rule

`generateDisputeReport` regenerates the English and Chinese reports and both PDFs
in a single call, so the two versions cannot drift. English is the source of
truth: the professional final recommendation is authored once in English and
carried verbatim into the Chinese report, which never adds a fact or judgment of
its own. PDFs are written to `Dispute Reports/<Review ID>/` as
`<Review ID>_AI_Dispute_Review_EN.pdf` and `..._ZH.pdf`, and the URLs are written
back to `Report EN URL` / `Report ZH URL`.

### Deployment

Deployed with `clasp` to the existing production Web App deployment
`AKfycbw01LTH...` so the exec URL never changes:

```
clasp push
clasp create-version "<description>"
clasp deploy --deploymentId AKfycbw01LTH... --versionNumber <n> --description "<description>"
```
