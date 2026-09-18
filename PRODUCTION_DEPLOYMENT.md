# Production Deployment

A single, linear checklist to take this app from a fresh VPS + domain to a live app container with a working MongoDB-backed `/admin`. This repo only runs the app itself (`web` in `docker-compose.yml`) — TLS, the reverse proxy, and any Cloudflare Tunnel are provisioned by a separate infra repo that fronts this container; see [step 6](#6-reverse-proxy--tls-separate-infra-repo). For reference material (all run scenarios, alternative hosts like Vercel), see [RUNNING.md](./RUNNING.md) and [DEPLOYMENT.md](./DEPLOYMENT.md) — this file is the condensed, do-this-in-order version specifically for the Docker + your-own-domain path.

## 0. Prerequisites

- A server (VPS) with Docker Desktop/Engine + the `docker compose` plugin installed and running
- A domain name, with its DNS `A`/`AAAA` record pointed at the server's public IP (managed alongside your reverse proxy setup in the infra repo)
- A MongoDB connection string (a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster works fine — no manual database/collection setup needed, it's created automatically on first use)

## 1. Get the code onto the server

```bash
git clone <your-repo-url> portfolio
cd portfolio
```

## 2. Create `.env.local` (real secrets — never committed)

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```
NEXT_PUBLIC_SITE_URL=https://your-domain.com
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/?appName=<app-name>
MONGODB_DB=portfolio
AUTH_SECRET=
```

Generate `AUTH_SECRET` and paste the value in:

```bash
npx auth secret
```

`.env.local` is gitignored — it must be created directly on the server (or copied over securely with `scp`/`rsync`), never pushed via git.

## 3. Create the admin login

Admin accounts are **not** an env var — they're a bcrypt-hashed JSON roster at `secrets/admin-users.json` (gitignored):

```bash
npm run admin:create
```

Follow the prompts (email, password, confirmation). Re-run this anytime to add another admin or rotate a password — no rebuild/restart needed, the file is read live.

## 4. Deploy

```bash
./deploy.sh https://your-domain.com
```

This single command:
1. Checks Docker is installed and running
2. Prompts to create `secrets/admin-users.json` if it's still missing (interactive only — non-interactive runs just warn)
3. Builds the image (`docker compose build`)
4. Starts the `web` container (`docker compose up -d`)
5. Waits for `web` to report healthy
6. Prints the local address (`http://127.0.0.1:3000` by default) once it's live

Step 3 builds on the server by default. For pulling a pre-built image instead (e.g. from GHCR via `./publish-ghcr.sh`) via `IMAGE=... ./deploy.sh --pull`, see [IMAGE_DEPLOYMENT_OPTIONS.md](./IMAGE_DEPLOYMENT_OPTIONS.md).

No other manual steps are required for the app container. Re-running `./deploy.sh` redeploys with the same image/settings.

## 5. Publish updates via GHCR (optional)

To build once and roll the same image out to this (and other) servers without rebuilding on each, from a separate machine (laptop/CI):

```bash
./publish-ghcr.sh   # prompts for GitHub owner/PAT/image name/tag, builds, and pushes — doesn't run the container
```

Then on the server:

```bash
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --pull
```

Or, if building directly on the server but you still want a GHCR copy (e.g. for backup, or to reuse on other servers) and to run it here too, do both in one step:

```bash
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --push
```

`--push` builds locally, logs in to the registry (reuse an existing `docker login`, or set `GHCR_USER`/`GHCR_TOKEN` for non-interactive login), pushes, then starts the container — same as the default flow but with an extra push step. `--pull` and `--push` are mutually exclusive.

## 6. Reverse proxy / TLS (separate infra repo)

This repo publishes the app on `127.0.0.1:3000` (see `HOST_BIND`/`HOST_PORT` in `docker-compose.yml`) and stops there — it does **not** open ports 80/443, terminate TLS, or run a Cloudflare Tunnel. Those are managed by a separate infra repo that fronts all services on the host (nginx/Caddy for TLS + reverse proxying, and/or a Cloudflare Tunnel). Point that proxy's upstream at `http://127.0.0.1:3000` on this host, and manage DNS/certificates/tunnel tokens there.

## 7. Verify

```bash
curl -I http://127.0.0.1:3000                     # 200 OK, direct to the app container
curl -I https://your-domain.com                    # 200 OK, once the infra repo's proxy is fronting it
curl -I https://your-domain.com/robots.txt         # 200 OK
curl -I https://your-domain.com/sitemap.xml        # 200 OK
curl -I https://your-domain.com/opengraph-image    # 200 OK, image/png
```

Then manually:
- [ ] Site loads correctly, security headers present (`X-Frame-Options`, etc. — visible via `curl -I`)
- [ ] `/admin/login` reachable, and you can sign in with the account from step 3
- [ ] Editing a section in `/admin` and saving reflects on the public site immediately (no redeploy needed)
- [ ] Profile photo (if using a Google Drive link) renders correctly — see [RUNNING.md](./RUNNING.md) for the required link format
- [ ] Open Graph image renders correctly when sharing the link (test with a social media debugger)

## 8. Ongoing operations

```bash
docker compose ps                         # status
docker compose logs -f web                # app logs
npm run admin:create                      # add/update an admin login (no restart needed)
docker compose down                       # stop (resume_cache volume persists)
```

**Deploying updates:**
```bash
git pull
./deploy.sh                               # redeploys, rebuilding locally
# or, if using GHCR:
./publish-ghcr.sh                         # from your dev machine, build + push (doesn't run it)
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --pull   # on the server
# or, build + push + run in one step, directly on the server:
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --push
```

## Reference: which file holds what

| File | Purpose | Committed to git? | Edited by |
|---|---|---|---|
| `.env.local` | Real secrets: `MONGODB_URI`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` | No (gitignored) | You, by hand |
| `secrets/admin-users.json` | Admin login roster (bcrypt hashes only) | No (gitignored) | `npm run admin:create` |

## Troubleshooting

See the [Troubleshooting section in DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting) for common issues (stale OG metadata, default-content fallback when MongoDB is unreachable, login failures from misconfigured `ADMIN_USERS_FILE`, etc.), and [RUNNING.md](./RUNNING.md#checking-status--logs) for log commands.
