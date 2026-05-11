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
