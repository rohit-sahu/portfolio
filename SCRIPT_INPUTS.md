# Script Input Reference (CLI flags, `.env` files, prompts)

A beginner's guide to how `publish-ghcr.sh`, `publish-ghcr 2.sh`, `deploy.sh`, and `deploy 2.sh` get their settings (like your GitHub username, image tag, or domain). Every setting on every script can come from **three, four, or five different places** depending on the script, tried in a fixed order until one has a value. This doc explains what those places are, and lists every setting each script accepts.

- `publish-ghcr.sh` / `publish-ghcr 2.sh`: **4 tiers** — CLI flag → raw env var → fallback file (`.env.local`) → prompt/default. No persisted state of their own.
- `deploy.sh` / `deploy 2.sh`: **5 tiers** — CLI flag → raw env var → **their own persisted `.env` state file** (auto-written after every run) → fallback file (`.env.local`) → prompt/default.

If you've never used a script like this before, read [How input resolution works](#how-input-resolution-works) first — it explains the concept once, in plain terms, before the per-script reference tables.

---

## How input resolution works

Think of each setting (e.g. "which GitHub username to use", or "which domain to deploy to") as a question the script needs answered before it can run. Instead of always asking you interactively, it checks a fixed list of sources, in a fixed order, and uses the **first one that has an answer**. `publish-ghcr.sh`/`publish-ghcr 2.sh` check **4 sources**; `deploy.sh`/`deploy 2.sh` check **5** (they have one extra source — their own memory of your last run). The shared steps work identically everywhere:

1. **CLI flag** — something you typed on the command line when running the script, e.g.:
   ```bash
   ./publish-ghcr.sh --owner myusername
   ./deploy.sh --app-dir /app
   ```
   This always wins if present — it's the most explicit thing you could have done.

2. **Raw environment variable** — a value already exported in your current shell, checked *before* any file:
   ```bash
   export GITHUB_OWNER=myusername
   # -- or, prefix form, same effect for a single run --
   GITHUB_OWNER=myusername ./publish-ghcr.sh
   ```
   This is useful for CI/automation (secrets as env vars, never written to disk) and for one-off overrides without touching a file.

3. **`deploy.sh`/`deploy 2.sh` only — their own persisted state file (`.env`)**. After every successful run, these two scripts write the settings they resolved (like `NEXT_PUBLIC_SITE_URL`, `APP_DIR`, `DOMAIN`, `IMAGE`) into a local `.env` file. On your *next* run, if you didn't pass a flag or export a raw variable, the script reads its own memory here first — so a bare re-run just repeats your last deploy without asking anything again. `publish-ghcr.sh`/`publish-ghcr 2.sh` don't have this step at all (they skip straight from tier 2 to tier 4 below) — they're meant to be one-shot commands, not "redeploy with memory" ones.

4. **Fallback settings file** (`.env.local` by default, or whatever `--env-file`/`ENV_FILE_PATH` points at) — a plain `KEY=VALUE` file you maintain by hand, good for pre-seeding a fresh checkout before you've ever run the script once:
   ```bash
   echo "GITHUB_OWNER=myusername" >> .env.local
   ```
   See [Environment files explained](#environment-files-explained) below for exactly which file and why.

5. **Interactive prompt, then a hardcoded default or hard error** — if nothing above had an answer, and you're running the script by hand in a real terminal, it asks you directly:
   ```
   GitHub username or org (GHCR owner):
   ```
   This step is **automatically skipped** when the script detects it's *not* running in a real terminal (e.g. inside CI, a cron job, or with input piped in) — so automation never hangs waiting for a human who isn't there. If the prompt is skipped (or you leave it blank) and the setting has a sensible default (like `latest` for an image tag), that default is used silently. If there's no safe default (like a GitHub token, or `deploy 2.sh`'s `DOMAIN` outside `--local` mode), it prints a clear error and exits instead of continuing with a bad guess.

**Why this design?** It lets the exact same script work several different ways without editing it:
- **By hand, first time:** just run it, answer the prompts.
- **By hand, repeatedly:** either let `deploy.sh`/`deploy 2.sh` remember for you (their own `.env`), or put your answers in `.env.local` once — either way, no more prompts.
- **In CI/automation:** pass everything as flags or environment variables — no prompts ever appear, and it never hangs.
- **One-off override, without disturbing your saved settings:** pass a CLI flag or raw env var for just that run — it wins for this run only; your persisted `.env`/`.env.local` files are untouched unless the setting is one that gets re-persisted (see the per-script tables below).

Every script's `--help` output documents this same order and lists every setting it accepts — run `./deploy.sh --help` (etc.) any time as the source of truth.

---

## Environment files explained

This repo already uses `.env`-style files for app configuration (see [RUNNING.md](./RUNNING.md#environment-files-explained-env-env-local-env-prod)); these deployment/publish scripts reuse the same convention as their fallback tier:

| File | Typical purpose | Read by these scripts? |
|---|---|---|
| `.env.local` | Your local dev/default settings (also read by `docker-compose.yml` and `npm run dev`) | **Yes — default file**, unless overridden |
| `.env.prod` | Production settings you `scp` to a server | Yes, if you pass `--env-file .env.prod` (or set `ENV_FILE_PATH=.env.prod`) |
| `.env` | `deploy.sh`'s and `deploy 2.sh`'s own auto-saved memory of your last run (`NEXT_PUBLIC_SITE_URL`, `APP_DIR`, `IMAGE`, and for `deploy 2.sh` also `DOMAIN`/`CADDYFILE`) | Yes, always, automatically — see [deploy.sh](#deploysh) / [deploy 2.sh](#deploy-2sh) below |
| `.env.example` | Template only, never read by any script | No |

**How to pick which file a script reads:**
```bash
--env-file .env.prod              # CLI flag, highest priority
# -- or --
ENV_FILE_PATH=.env.prod ./deploy.sh   # environment variable, same effect
```
If you don't specify anything, it defaults to `.env.local`. If that file doesn't exist, it's silently skipped — not an error.

**A file is just plain text**, one `KEY=VALUE` per line, e.g.:
```
GITHUB_OWNER=myusername
IMAGE_TAG=v1.2.0
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

> ⚠️ **Security note:** Prefer passing secrets like `GITHUB_TOKEN` as a real (unexported-to-disk) environment variable or a CI secret, rather than writing them into a file. If you do put a token in a file, keep it out of version control — this repo's `.gitignore` already excludes all `.env*` files except `.env.example`.

---

## `publish-ghcr.sh`

Builds and pushes the portfolio image to GHCR using `docker compose build`/`push` (shares the build definition with `deploy.sh`).

| Setting | CLI flag | Env var / `.env` key | Prompted? | Default (if nothing set) |
|---|---|---|---|---|
| GHCR owner (your GitHub username/org) | `--owner OWNER` | `GITHUB_OWNER` | Yes | *(none — required, errors if still empty)* |
| GitHub token (needs `write:packages` scope) | `--token PAT` | `GITHUB_TOKEN` | Yes (hidden input) | *(none — required, errors if still empty)* |
| Image name | `--image-name NAME` | `IMAGE_NAME` | Yes | `rohit-portfolio` |
| Image tag | `--tag TAG` | `IMAGE_TAG` | Yes | `latest` |
| Site URL (baked into the build) | `--site-url URL` | `NEXT_PUBLIC_SITE_URL` | Yes | `https://rohitkumar.skytech.in` |
| Container-internal working directory | `--app-dir DIR` | `APP_DIR` | Yes | `/app` |
| Settings file to read | `--env-file PATH` | `ENV_FILE_PATH` | — | `.env.local` |

**Examples:**
```bash
# Fully interactive (answers every prompt by hand)
./publish-ghcr.sh

# Fully non-interactive (CI-friendly, no prompts)
GITHUB_OWNER=myuser GITHUB_TOKEN=ghp_xxx ./publish-ghcr.sh --tag v1.2.0

# Read most settings from a file, override just the tag
./publish-ghcr.sh --env-file .env.prod --tag v1.2.0

# Override the container-internal working directory (rarely needed)
./publish-ghcr.sh --app-dir /srv/app
```

Behavior notes:
- If the resolved tag isn't already `latest`, the script also tags and pushes a `:latest` copy alongside it (so `:latest` always points at your most recent publish, while the versioned tag stays around for rollback).
- Run `./publish-ghcr.sh --help` for the always-up-to-date reference.

---

## `publish-ghcr 2.sh`

A more generic GHCR publisher — plain `docker build`/`push` (no `docker-compose.yml` dependency), with extra flexibility like custom build args and Dockerfile paths.

| Setting | CLI flag | Env var / `.env` key | Prompted? | Default (if nothing set) |
|---|---|---|---|---|
| GitHub username | `--username U` | `GITHUB_USERNAME` | Yes | *(none — required)* |
| GitHub token | `--token PAT` | `GITHUB_TOKEN` | Yes (hidden input) | *(none — required)* |
| Repo name (optional path segment) | `--repo REPO` | `REPO_NAME` | Yes | *(blank — optional, see below)* |
| Image name | `--image-name NAME` | `IMAGE_NAME` | Yes | *(none — required)* |
| Image tag | `--tag TAG` | `IMAGE_TAG` | Yes | `latest` |
| Path to Dockerfile's folder | `--path PATH` | `DOCKER_PATH` | Yes | `.` (current directory) |
| Extra `docker build --build-arg` values | `--build-args "K=V K2=V2"` | `BUILD_ARGS_INPUT` | Yes | *(blank — optional)* |
| Settings file to read | `--env-file PATH` | `ENV_FILE_PATH` | — | `.env.local` |

**`REPO_NAME` controls the image path shape:**
- Left blank → `ghcr.io/USERNAME/IMAGE_NAME:TAG` (2-segment, simplest — good for single-image repos)
- Set → `ghcr.io/USERNAME/REPO_NAME/IMAGE_NAME:TAG` (3-segment — useful if one repo publishes multiple images)

**Examples:**
```bash
./publish-ghcr\ 2.sh --username myuser --image-name my-app --tag v1.2.0
GITHUB_USERNAME=myuser GITHUB_TOKEN=ghp_xxx IMAGE_NAME=my-app ./publish-ghcr\ 2.sh   # no prompts
```

Run `./publish-ghcr\ 2.sh --help` for the always-up-to-date reference (the space in the filename needs escaping or quoting on the command line).

---

## `deploy.sh`

One-command deploy for just the app container (no reverse proxy/TLS — see [RUNNING.md](./RUNNING.md) for that split).

| Setting | CLI flag / positional arg | Env var / `.env` key | Prompted? | Default (if nothing set) |
|---|---|---|---|---|
| Site URL | `[next-public-site-url]` (positional) | `NEXT_PUBLIC_SITE_URL` (in `.env`, see below) | Yes | `https://rohitkumar.skytech.in` |
| Container-internal working directory | `--app-dir DIR` | `APP_DIR` (in `.env`) | Yes | `/app` |
| Pull a pre-built image instead of building | `--pull` | *(boolean flag)* | — | off |
| Build, push, and run here too | `--push` | *(boolean flag)* | — | off |
| Registry image reference (only if `--pull`/`--push`) | *(no flag — see below)* | `IMAGE` (in `.env`) | Yes | *(none — required for `--pull`/`--push`)* |
| GHCR username for registry login (only used with `--push`, optional) | `--ghcr-user USER` | `GHCR_USER` (never persisted — see below) | Conditional *(only if not already logged in — see below)* | *(none — skips login, push attempted as-is)* |
| GHCR token for registry login (only used with `--push`, optional) | `--ghcr-token TOKEN` | `GHCR_TOKEN` (never persisted) | Conditional *(only if not already logged in)* | *(none — skips login)* |
| Settings file to read | `--env-file PATH` | `ENV_FILE_PATH` | — | `.env.local` |
| Skip starting the stack (build/pull/push only) | `--no-up` | *(boolean flag)* | — | off |

**`deploy.sh` uses the full 5-tier chain described in [How input resolution works](#how-input-resolution-works)** for `NEXT_PUBLIC_SITE_URL`, `APP_DIR`, and `IMAGE`:
1. CLI flag / positional arg
2. Raw already-exported env var, e.g. `export NEXT_PUBLIC_SITE_URL=...` (or `NEXT_PUBLIC_SITE_URL=... ./deploy.sh`)
3. **`deploy.sh`'s own state file (`.env`)** — automatically (re-)written after every successful run, so a bare `./deploy.sh` re-run remembers your last site URL/app dir/image without you typing anything
4. The fallback settings file (`--env-file`/`.env.local`) — useful for pre-seeding a fresh checkout before you've ever run the script
5. Interactive prompt, then hardcoded default (or a hard error for `IMAGE` when `--pull`/`--push` is used but nothing resolved it)

> **Note:** `GHCR_USER`/`GHCR_TOKEN` are deliberately **excluded** from step 3 — they're never written into `.env`, even though everything else resolved for a run is. Writing registry credentials into a script-managed plaintext file is a real credential-leak risk, so they keep their own separate chain instead (see below), and you'll be asked for them again next time unless you export them or already have a `docker login` session.

**`GHCR_USER`/`GHCR_TOKEN` resolution is a special 4-step chain** (only relevant when using `--push`):
1. **Already logged in?** — if `docker`'s config already has an auth entry for that registry (from a prior `docker login`, a credential helper, or a CI runner that pre-authenticates), login is skipped entirely — nothing is asked.
2. **CLI flag / env var / `.env` file** — if not already logged in, these are checked in the usual order.
3. **Interactive prompt** — only if still unset *and* not already logged in *and* running in a real terminal. You can leave the username blank to skip login and let the push attempt proceed anyway.
4. **Skip silently** — in a non-interactive run (CI) with nothing provided, login is skipped and `docker compose push` is attempted as-is; it will fail with its own clear auth error if login truly was required.

**`--env-file`, `--ghcr-user`, and `--ghcr-token` each accept two equivalent syntaxes** — a space-separated form (`--flag VALUE`) or an equals form (`--flag=VALUE`). Both are parsed identically; pick whichever reads better to you (the equals form is handy in scripts/`Makefile`s where quoting is fiddly):
```bash
--env-file .env.prod          # space form
--env-file=.env.prod          # equals form, same effect

--ghcr-user myuser             # space form
--ghcr-user=myuser             # equals form, same effect

--ghcr-token ghp_xxx            # space form
--ghcr-token=ghp_xxx            # equals form, same effect
```

**Examples:**
```bash
# Build and run locally, using the hardcoded default site URL
./deploy.sh

# Build and run locally with your real domain
./deploy.sh https://your-domain.com

# Pull a pre-built image instead of building here
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --pull

# Build here, push to a registry, AND run here (already `docker login`'d, or will prompt if not)
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --push

# Same, but fully non-interactive (CI-friendly, no prompts) — space-separated flag values
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --push --ghcr-user myuser --ghcr-token ghp_xxx

# Same as above, but using the equals form for every valued flag
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --push --env-file=.env.prod --ghcr-user=myuser --ghcr-token=ghp_xxx

# Mixed forms are fine too — order doesn't matter
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --push --env-file .env.prod --ghcr-user=myuser --ghcr-token ghp_xxx

# Build/push the image only, without starting the container here
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy.sh --push --no-up

# Override the container-internal working directory (rarely needed)
./deploy.sh --app-dir /srv/app
```

`--pull` and `--push` are mutually exclusive. Run `./deploy.sh --help` for the always-up-to-date reference.

---

## `deploy 2.sh`

Full production stack (nginx + Caddy for automatic HTTPS + the app, optionally a Cloudflare Tunnel). Like `deploy.sh`, it uses the full 5-tier chain — including its own auto-saved settings file — for every core setting.

| Setting | CLI flag / positional arg | Source key | Prompted? | Default (if nothing set) |
|---|---|---|---|---|
| Domain | `<domain>` (positional) | `DOMAIN` (in `.env`, see below) | Yes (unless `--local`) | *(none — required unless `--local`, which defaults to `localhost`)* |
| Site URL | `[next-public-site-url]` (positional) | `NEXT_PUBLIC_SITE_URL` (in `.env`) | Yes | `https://<domain>` (derived) |
| Local self-signed testing mode | `--local` | *(boolean flag)* | — | off |
| Cloudflare named tunnel | `--tunnel` | *(boolean flag)* | — | off |
| Cloudflare quick tunnel | `--quick-tunnel` | *(boolean flag)* | — | off |
| Pull a pre-built image instead of building | `--pull` | *(boolean flag)* | — | off |
| Build locally, push to a registry, then run here too | `--push` | *(boolean flag)* | — | off |
| Registry image reference (only if `--pull`/`--push`) | *(no flag — see below)* | `IMAGE` (in `.env`) | Yes | *(none — required)* |
| Container-internal working directory | `--app-dir DIR` | `APP_DIR` (in `.env`) | Yes | `/app` |
| GHCR username for registry login (only used with `--push`, optional) | `--ghcr-user USER` | `GHCR_USER` (never persisted — see below) | Conditional *(only if not already logged in — see below)* | *(none — skips login, push attempted as-is)* |
| GHCR token for registry login (only used with `--push`, optional) | `--ghcr-token TOKEN` | `GHCR_TOKEN` (never persisted) | Conditional *(only if not already logged in)* | *(none — skips login)* |
| Fallback settings file to read | `--env-file PATH` | `ENV_FILE_PATH` | — | `.env.local` |
| Skip starting the stack (build/pull/push only) | `--no-up` | *(boolean flag)* | — | off |

**This script's resolution order has FIVE tiers**, same shape as `deploy.sh` (see [How input resolution works](#how-input-resolution-works)):
1. CLI flag / positional arg
2. Raw already-exported env var, e.g. `export DOMAIN=your-domain.com` (or `DOMAIN=your-domain.com ./deploy\ 2.sh`) — this tier is new: previously `deploy 2.sh` only checked its own `.env` state and the fallback file here, so a plain exported `DOMAIN`/`APP_DIR` without a matching CLI flag used to be silently ignored. It's now checked, just like every other setting.
3. **This script's own state file (`.env`)** — automatically written after every successful run, so a bare `./deploy\ 2.sh` re-run remembers your last domain/image/app-dir without you typing anything
4. The general fallback settings file (`--env-file`/`.env.local`) — useful for pre-seeding a fresh checkout before you've ever run the script
5. Interactive prompt, then hardcoded default or hard error

> **Gotcha:** each setting is resolved independently, so changing `DOMAIN` on a re-run does **not** automatically change a previously-persisted `NEXT_PUBLIC_SITE_URL` — if you want the site URL to follow a new domain, pass it explicitly too (`./deploy\ 2.sh new-domain.com https://new-domain.com`) or delete the `NEXT_PUBLIC_SITE_URL=` line from `.env` first.

> **Note:** just like `deploy.sh`, `GHCR_USER`/`GHCR_TOKEN` are deliberately **excluded** from step 3 (never written to `.env`) for the same credential-leak reason — see below.

**`GHCR_USER`/`GHCR_TOKEN` (only relevant with `--push`) use their own conditional chain**, same as `deploy.sh`:
1. **Already logged in?** — if `docker`'s config already has an auth entry for the target registry, login is skipped entirely.
2. **CLI flag / env var / `.env`/`.env.local`** — checked if not already logged in.
3. **Interactive prompt** — only if still unset, not already logged in, and running in a real terminal (leave username blank to skip login and push anyway).
4. **Skip silently** — non-interactive with nothing provided; `docker compose push` reports its own auth error if login was actually needed.

**Examples:**
```bash
# First run — you'll be prompted for anything not passed as an arg
./deploy\ 2.sh your-domain.com

# Later — no arguments needed, it remembers the domain from step above
./deploy\ 2.sh

# Local self-signed testing, no domain/DNS needed at all
./deploy\ 2.sh --local

# Pull a pre-built image
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy\ 2.sh --pull your-domain.com

# Build here, push to a registry, AND run here too
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy\ 2.sh --push your-domain.com

# Build/push the image only, without starting the stack here
IMAGE=ghcr.io/<owner>/rohit-portfolio:latest ./deploy\ 2.sh --push --no-up your-domain.com
```

`--tunnel` and `--quick-tunnel` are mutually exclusive. Run `./deploy\ 2.sh --help` for the always-up-to-date reference (the space in the filename needs escaping or quoting on the command line).

---

## Quick troubleshooting

- **"X is required" error, even though I set it** — check you didn't typo the flag/variable name (see the tables above), and that you're not accidentally overriding it with an empty CLI flag (an empty flag value always beats a non-empty environment variable/file value).
- **Script isn't prompting me at all, just errors out** — you're probably running it with input piped in or from a non-interactive shell (e.g. inside another script, SSH `-n`, or CI). Pass the missing value explicitly as a flag or environment variable instead.
- **I put a value in `.env.local` but it's being ignored** — a CLI flag, an already-exported environment variable, or (for `deploy.sh`/`deploy 2.sh`) a value already saved in their own `.env` state file, of the same name, all win over `.env.local`. Unset the environment variable, don't pass the flag, and check `.env` doesn't already have the same key, to let `.env.local`'s value take effect.
- **`deploy.sh`/`deploy 2.sh` aren't picking up what I put in `.env.local`** — check their own `.env` file first (`cat .env`); if that already has the same key from a previous run, it wins over `.env.local`. Edit `.env` directly, or delete the key from it, to let `.env.local`'s value take effect.
- **I changed a value but a re-run still uses the old one** — for `deploy.sh`/`deploy 2.sh`, the resolved value from *every* successful run is saved back into `.env` (except `GHCR_USER`/`GHCR_TOKEN`, which are never persisted). If you edited `.env.local` and nothing changed, it's because `.env`'s own copy of that key is winning (tier 3 beats tier 4) — either pass the new value as a CLI flag/env var for one run, or edit/delete the key directly in `.env`.
- **`deploy 2.sh` changed my `DOMAIN` but kept the old `NEXT_PUBLIC_SITE_URL`** — expected: each setting is resolved and persisted independently, so a new domain doesn't automatically update a previously-saved site URL. Pass both explicitly, or edit `.env`, to keep them in sync.
- **Do `GHCR_USER`/`GHCR_TOKEN` ever get saved to `.env`?** — No, never, even though `deploy.sh`/`deploy 2.sh` persist every other resolved setting. This is intentional — see the security note in each script's section above.
