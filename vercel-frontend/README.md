# DiabCare WoundCam — Vercel Frontend Copy

This folder is a standalone copy of the deployed frontend from:

<https://diab-care-wound-cam-mtn-inventor-pc.vercel.app/>

It is intentionally separate from the original application in `client/`. It doesn't import, share, or modify the old React source tree.

## Run locally

From this folder:

```bash
pnpm dev
```

Or use Python directly:

```bash
python3 -m http.server 5174 --bind 0.0.0.0
```

Then open `http://localhost:5174/`.

## What's included

- `index.html` — copied deployed document shell.
- `assets/index-CjqjVV4H.js` — complete deployed JavaScript bundle containing the compiled frontend components and interactions.
- `assets/index-BuEJWz0O.css` — deployed stylesheet bundle and responsive rules.
- `assets/diabcare_logo_1781428459884-3o6DXBUD.jpg` — the logo referenced by the deployed bundle.
- `assets/fonts.css` and `assets/fonts/` — local copies of the deployed Inter, Sarabun, and JetBrains Mono font resources.
- `reference/` — desktop, mobile, and post-login dashboard screenshots captured from the Vercel page.
- `.stitch/DESIGN.md` — extracted visual system and reconstruction notes.

The public deployment exposes compiled assets rather than the original React source modules. This copy preserves the shipped frontend exactly at the bundle level, including the login screen, Thai dashboard, navigation, camera surface, reports, settings, and other compiled surfaces included in the Vercel JavaScript bundle.

## Demo login

The deployed UI includes these local demo credentials:

| Role | Username | Password |
| --- | --- | --- |
| เจ้าหน้าที่ | `officer` | `123456` |
| พยาบาล | `rn` | `123456` |
| ผู้ดูแลผู้ป่วย | `caregiver` | `123456` |

These credentials belong to the public demo flow. They are not production credentials.

## Boundary with the old app

- Original app: `client/`
- Copied Vercel app: `vercel-frontend/`
- No local login wrapper was added to `client/`.
- The root app routing and dashboard source remain as they were before the previous preview integration.
- The copied bundle retains the deployed app's external API endpoints for features that call remote inference services. The public login and dashboard work from the copied assets alone.
