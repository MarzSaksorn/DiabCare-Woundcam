# Local Frontend Preview

The public route now has a local, browser-runnable implementation of the extracted DiabCare WoundCam login flow.

## Run it

```bash
pnpm install --frozen-lockfile
pnpm vite --host 0.0.0.0 --port 5173
```

Open `/` for the Thai-first login screen. After a successful local demo sign-in, the existing care dashboard opens at `/workspace`.

## Demo accounts

| Role | Username | Password |
| --- | --- | --- |
| เจ้าหน้าที่ | `officer` | `123456` |
| พยาบาล | `rn` | `123456` |
| ผู้ดูแลผู้ป่วย | `caregiver` | `123456` |

This is a local UI preview only. It stores a demo session in `localStorage` and does not authenticate against production services.

## Implemented interactions

- Role selection updates the matching demo username.
- Password visibility toggle works with keyboard and pointer input.
- Empty and invalid submissions show an inline alert.
- Valid submission shows the loading state, then opens the local workspace.
- The extracted logo is served from `client/public/assets/diabcare_logo.jpg`.
- The login layout matches the captured desktop and mobile proportions.

The design tokens and visual rationale live in [`.stitch/DESIGN.md`](../.stitch/DESIGN.md).
