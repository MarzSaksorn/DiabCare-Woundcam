# DiabCare WoundCam Public Demo

This branch contains a separate, read-only demo stack. It runs the existing application in `PUBLIC_DEMO_MODE=true`, seeds a local SQLite database with fabricated records, and does not receive Supabase or PostgreSQL credentials. It is an interface demo only, not a clinical system.

The normal application Compose setup remains unchanged. The demo stack uses its own Compose file and project-scoped SQLite volume.

## Run locally

From the repository root:

```bash
cp .env.public-demo.example .env.public-demo
docker compose --env-file .env.public-demo -f docker-compose.public-demo.yml up --build -d
curl --fail http://127.0.0.1:3301/healthz
```

Open `http://127.0.0.1:3301`. The service publishes only on host loopback, so it isn't directly reachable from the LAN or public internet. The persistent SQLite file lives in the `public-demo-data` Compose volume and is seeded automatically on first startup. The navbar and title bar stay in place; a visible banner identifies the synthetic, read-only mode.

In demo mode, the app skips Supabase authentication and storage routes. Read endpoints use the SQLite adapter and bundled SVG illustrations. Visitors can capture or select an image and run the wound-analysis pipeline. The image is sent to this app's server for temporary inference and is not stored. Use synthetic images only; do not submit real patient information or photographs. The demo allows one inference at a time and caps inference at 12 requests per minute per server process.

Patient registration and editing, photo saving/deletion, and all other record-changing operations remain disabled in the UI and rejected by server middleware. The demo guest is not an administrator. Analysis returns model suggestions for demonstration only and does not provide a diagnosis or treatment advice.

## Serve through Cloudflare Tunnel with HTTPS

A tunnel keeps the application origin private and avoids requiring a public IP or inbound host ports. Cloudflare terminates visitor TLS; the tunnel then forwards to the HTTP app over the private Compose network. Visitors should use the HTTPS hostname configured in Cloudflare, not the loopback origin.

1. Create or select a Cloudflare Tunnel in the Cloudflare dashboard and copy its token into the ignored `.env.public-demo` file as `CLOUDFLARE_TUNNEL_TOKEN=...`. Never commit that file or print the token in logs.
2. Configure a public hostname in the tunnel dashboard. Set its service target to `http://diabcare-woundcam-demo:3000`. That hostname must point to the service name and internal port, not `localhost` or host port `3301`.
3. Start the app and tunnel profile:

   ```bash
   docker compose --env-file .env.public-demo -f docker-compose.public-demo.yml up --build -d
   docker compose --env-file .env.public-demo -f docker-compose.public-demo.yml --profile cloudflare-tunnel up -d cloudflared
   ```

4. Confirm the hostname resolves through the tunnel and its HTTPS certificate validates. In Cloudflare, enable **Always Use HTTPS** if you also want plain HTTP visitor requests redirected to HTTPS. This repository does not change DNS, Cloudflare account settings, or deploy a public service.

Do not publish the app container's port on `0.0.0.0`. The Compose file deliberately binds the origin to `127.0.0.1` and exposes no inbound ports for `cloudflared`.

## Stop and reset

Stop the demo without deleting its synthetic data:

```bash
docker compose --env-file .env.public-demo -f docker-compose.public-demo.yml --profile cloudflare-tunnel down
```

To discard and reseed the demo database, remove this Compose project's volume with `down -v`. That command permanently deletes the local SQLite demo file; don't use it if you want to keep locally made database changes.
