# Running the Application

The public site reads its content from MongoDB (editable at `/admin`), so every scenario below — local dev included — needs a MongoDB connection and at least one admin login configured first.

This repo only builds/runs the Next.js app container itself (`web` in `docker-compose.yml`). TLS termination, the reverse proxy, and any Cloudflare Tunnel are provisioned separately in an infra repo that fronts this container — see [Reverse proxy / TLS](#reverse-proxy--tls-not-in-this-repo).

## Quick reference

| Scenario | Command |
|---|---|
| Local dev (no Docker) | `npm run dev` |
| Local Docker test | `./deploy.sh` |
| Production deploy, build on server | `./deploy.sh https://your-domain.com` |
| Build + push to GHCR, don't run here | `./publish-ghcr.sh` |
| Build + push to GHCR + run here too | `IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --push` |
| Pull a pre-built image + run here | `IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --pull` |

`--pull` and `--push` are mutually exclusive. Re-running `./deploy.sh` redeploys with the same settings. It also interactively prompts to create a missing admin login when needed — no manual steps required on a fresh checkout.

---

## 1. Local development (no Docker)

Step by step:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` (MongoDB URI/DB, auto-generates `AUTH_SECRET`, prompts for site URL — defaults to `http://localhost:3000`):
   ```bash
   npm run env:create -- local
   ```
   (See [Environment files explained](#environment-files-explained-env-env-local-env-prod) for exactly what this writes and why.)
3. Create your first `/admin` login:
   ```bash
   npm run admin:create
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
   - Public site: http://localhost:3000
   - Admin: http://localhost:3000/admin/login

`ADMIN_USERS_FILE` and `RESUME_CACHE_FILE` can be left unset in `.env.local` for local dev — they default to `secrets/admin-users.json` and `./data/resume-cache.json` relative to the project root.

---

## 2. Testing locally with Docker

Prerequisites:
- Docker Desktop/Engine installed and running, with the `docker compose` plugin
- `.env.local` already created (step 1.2 above) — `docker-compose.yml` loads it via `env_file` on whichever host runs `docker compose`

Step by step:

1. Run:
   ```bash
   ./deploy.sh
   ```
   This does, in order:
   1. Checks `node`/`npm`/`docker`/`docker compose` are installed and the Docker daemon is running
   2. Runs `npm install`
   3. Prompts to create `secrets/admin-users.json` (via `npm run admin:create`) if it's still empty
   4. Builds the image: `docker compose build`
   5. Starts the container: `docker compose up -d`
   6. Waits (up to 180s) for the `web` container's healthcheck to report `healthy`
   7. Prints `http://127.0.0.1:3000` once it's live
2. Smoke-test it directly (no reverse proxy is started by this repo):
   ```bash
   curl -I http://127.0.0.1:3000
   ```
3. Check logs/status any time:
   ```bash
   docker compose ps
   docker compose logs -f web
   ```
4. Stop it:
   ```bash
   docker compose down
   ```
   The `resume_cache` named volume persists across `down`/`up` cycles.

To test under a specific site URL:
```bash
./deploy.sh https://your-domain.com
```

---

## 3. Building the production image

Three ways to get the image built, depending on your workflow — see [IMAGE_DEPLOYMENT_OPTIONS.md](./IMAGE_DEPLOYMENT_OPTIONS.md) for the full comparison including Docker Hub/ECR/manual transfer.

### 3a. Build directly on the deploy server (simplest, no registry)

```bash
./deploy.sh https://your-domain.com
```
`docker compose build` runs on that same machine, using the `Dockerfile` in this repo. No registry account needed. Best for a single server.

### 3b. Build + push to GHCR from a separate machine (e.g. your laptop or CI)

```bash
./publish-ghcr.sh
```
Every setting (GitHub owner, PAT, image name/tag, site URL) can come from a CLI flag, an environment variable, a `.env.local`/`.env.prod` file, or an interactive prompt — see **[SCRIPT_INPUTS.md](./SCRIPT_INPUTS.md)** for the full reference table and examples of each. Quick examples:
```bash
./publish-ghcr.sh                                          # fully interactive, answers every prompt by hand
GITHUB_OWNER=myuser GITHUB_TOKEN=ghp_xxx ./publish-ghcr.sh --tag v1.2.0   # no prompts, CI-friendly
```
Internally it sets `IMAGE`/`NEXT_PUBLIC_SITE_URL` env vars and runs the same `docker compose build` + `docker compose push web` that `deploy.sh` uses — so there's one build definition, not two. It does **not** start the container. Then, on the actual deploy target:
```bash
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --pull
```

### 3c. Build + push to GHCR + run, all on the same server

If the server itself should build, keep a GHCR copy (for backup/reuse on other servers), and serve the site immediately:
```bash
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --push
```
This builds locally (`docker compose build`), logs in to the registry (reuses an existing `docker login` session, or set `GHCR_USER`/`GHCR_TOKEN` env vars for a non-interactive login), pushes with `docker compose push web`, then starts the container as usual.

---

## 4. Deploy to production

Step by step, once you have a server with Docker + DNS pointed at it (see [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for the full ordered checklist):

1. Get the code onto the server:
   ```bash
   git clone <your-repo-url> portfolio
   cd portfolio
   ```
2. Create production secrets **locally** (keeps them out of your dev `.env.local`):
   ```bash
   npm run env:create -- prod          # writes .env.prod (prompts for MongoDB URI, DB, site URL; auto-generates AUTH_SECRET)
   ```
3. Copy it to the server, renaming it to `.env.local` (the only filename `docker-compose.yml`'s `env_file:` reads by default):
   ```bash
   scp .env.prod user@server:/path/to/portfolio/.env.local
   ```
4. Create the admin login **on the server** (or `scp` an existing `secrets/admin-users.json` over):
   ```bash
   ssh user@server 'cd /path/to/portfolio && npm run admin:create'
   ```
5. Deploy — pick one of 3a/3b+pull/3c from [section 3](#3-building-the-production-image) above, e.g.:
   ```bash
   ssh user@server 'cd /path/to/portfolio && ./deploy.sh https://your-domain.com'
   ```
6. Point your infra repo's reverse proxy at `http://127.0.0.1:3000` on that server (see [section 5](#5-reverse-proxy--tls-not-in-this-repo)).

`scp`/`rsync` only for `.env.prod`/`.env.local` — never git, both are gitignored. Re-running `./deploy.sh` redeploys with the same settings.

---

## 5. Reverse proxy / TLS (not in this repo)

This repo only starts the `web` container, published on `127.0.0.1:3000` by default (override with `HOST_BIND`/`HOST_PORT`). Fronting it with a reverse proxy (nginx/Caddy) for TLS termination and your custom domain, and/or a Cloudflare Tunnel for zero-open-ports exposure, is handled by a separate infra repo that manages those concerns for all services on the host. Point that proxy's upstream at `http://127.0.0.1:3000` on this host.

---

## Environment files explained (`.env`, `.env.local`, `.env.prod`)

| File | How it's created | Read by | Committed to git? |
|---|---|---|---|
| `.env.example` | Hand-written template, placeholder values only | Nothing at runtime — reference/copy source | Yes |
| `.env.local` | `npm run env:create -- local`, or `cp .env.example .env.local` by hand | `npm run dev` (Next.js convention) **and** `docker-compose.yml`'s `env_file:` on whichever host runs `docker compose` | No (gitignored, mode `600`) |
| `.env.prod` | `npm run env:create -- prod` | Nothing directly — you `scp`/copy it to the server **renamed to `.env.local`** (see [section 4](#4-deploy-to-production)) | No (gitignored, mode `600`) |
| `.env` | Not generated/used by the current scripts | — | — |

`scripts/node/create-env.mjs` (`npm run env:create`) does the following:
1. Takes `local` or `prod` as an argument (or prompts if omitted) to pick the target file and its defaults (`http://localhost:3000` vs `https://your-domain.com`).
2. Prompts for `MONGODB_URI`, `MONGODB_DB` (default `portfolio`), `NEXT_PUBLIC_SITE_URL` — pressing Enter on an existing file keeps its current value.
3. Generates `AUTH_SECRET` via `npx auth secret` on first write only (falls back to a locally generated secret if offline); **always preserves an existing `AUTH_SECRET`** on re-runs, since rotating it invalidates every active admin session.
4. Writes the file with `chmod 600`.

`secrets/admin-users.json` is separate and not part of any `.env*` file — see `npm run admin:create` in [Managing admin logins](#managing-admin-logins).

The deploy/publish scripts (`deploy.sh`, `deploy 2.sh`, `publish-ghcr.sh`, `publish-ghcr 2.sh`) also read `.env.local`/`.env.prod` as one of their fallback input sources (via `--env-file`) — see **[SCRIPT_INPUTS.md](./SCRIPT_INPUTS.md)** for exactly how that works alongside CLI flags and prompts.

## Managing admin logins

Add, update, or rotate an admin's password at any time — works identically for local dev and Docker (the file is bind-mounted live, no rebuild/restart needed):

```bash
npm run admin:create
```

Follow the prompts (email, password, confirmation). It upserts by email — re-running for the same email updates their password. To remove an admin, edit `secrets/admin-users.json` directly and delete their entry. Passwords are bcrypt-hashed before being written; the plaintext is never logged or stored.

## Checking status / logs

```bash
docker compose ps
docker compose logs -f web
```

## Stopping

```bash
docker compose down
```

The `resume_cache` volume (local read-through cache for resume content + downloaded profile photo) persists across restarts.
