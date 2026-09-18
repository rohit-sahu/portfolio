#!/usr/bin/env bash
# One-command deploy for the portfolio app container only. The reverse
# proxy, TLS termination, and Cloudflare Tunnel are managed in a separate
# infra repo — this script only builds/pulls the `web` image, starts it,
# and waits for it to report healthy. Safe to re-run; settings needed again
# (like NEXT_PUBLIC_SITE_URL) are read from the environment/.env.local.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
# shellcheck source=./scripts/lib/deploy-env.sh
source ./scripts/lib/deploy-env.sh

ENV_FILE=".env"
HEALTH_TIMEOUT=180

usage() {
	cat <<EOF
Usage: $0 [OPTIONS] [next-public-site-url]

Every setting below can come from FIVE input sources, tried in this order
(first match wins):
  1. CLI flag / positional arg   e.g. $0 https://your-domain.com
  2. Raw already-exported env var  e.g. export NEXT_PUBLIC_SITE_URL=...
                                    (or NEXT_PUBLIC_SITE_URL=... $0)
  3. This script's own state file  ${ENV_FILE} (auto-written after every
                                    run, so a bare re-run remembers it)
  4. Fallback settings file        --env-file/\$ENV_FILE_PATH (default:
                                    .env.local, silently skipped if missing)
  5. Interactive prompt (only asked when stdin is a real terminal — never
     hangs in CI/non-interactive runs), then a hardcoded default

Options (CLI flag | env var / source key | default):
  [next-public-site-url] (positional) | NEXT_PUBLIC_SITE_URL (in ${ENV_FILE}) | https://rohitkumar.skytech.in
  --app-dir DIR                       | APP_DIR (in ${ENV_FILE})             | /app
  --pull                              | (n/a, boolean flag)  | off
  --push                              | (n/a, boolean flag)  | off
  (with --pull/--push) IMAGE is set via | IMAGE (in ${ENV_FILE})            | (none — required for --pull/--push)
  --ghcr-user USER (with --push, optional) | GHCR_USER        | (none — see below)
  --ghcr-token TOKEN (with --push, optional) | GHCR_TOKEN     | (none — see below)
  --env-file PATH                     | ENV_FILE_PATH        | .env.local
  --no-up                             | (n/a, boolean flag)  | off
  -h, --help                            Show this help and exit

--app-dir sets the container-internal working directory (forwarded to
docker-compose.yml's APP_DIR build arg). Rarely needs to change — only
override if it conflicts with something else in your infra.

Build and run locally (default):
  $0
  $0 https://your-domain.com

Pull a pre-built image instead of building locally (--pull): requires IMAGE
to be set to a registry reference — e.g. one pushed with ./publish-ghcr.sh:
  IMAGE=ghcr.io/<owner>/rohit-portfolio:latest $0 --pull

Build locally, push the result to a registry, then run it here too (--push):
requires IMAGE to be set. Useful when this same server should both serve the
site and keep a registry copy (for backup / reuse on other servers). Registry
login is handled automatically, in this order:
  1. Already logged in? (existing 'docker login'/credential helper entry for
     that registry) -> skip login entirely, just push.
  2. Otherwise, GHCR_USER/GHCR_TOKEN from --ghcr-user/--ghcr-token, an env
     var, or --env-file/.env.local -> log in with those.
  3. Otherwise, if this is a real terminal, prompt for a username/token
     (leave username blank to skip login and try pushing anyway).
  4. Otherwise (non-interactive, nothing provided) -> skip login and attempt
     the push as-is; docker will report a clear auth error if one was needed.
  IMAGE=ghcr.io/<owner>/rohit-portfolio:latest $0 --push
  $0 --push --ghcr-user myuser --ghcr-token ghp_xxx

--pull and --push are mutually exclusive. Neither flag = build and run
locally only, no registry involved.

The container listens on 127.0.0.1:3000 by default (see HOST_BIND/HOST_PORT
in docker-compose.yml) — point your reverse proxy (managed in the infra
repo) at that address, not directly at the internet.

Also prompts to create the first /admin login (via 'npm run admin:create')
if secrets/admin-users.json has none yet and this is an interactive terminal.

--no-up skips the final 'docker compose up -d' (and the health-check wait)
after building/pulling/pushing — useful when you only want the image
prepared and will start the stack yourself later.
EOF
}

# Check for Node.js and npm, which are required for some setup tasks
if ! command -v node >/dev/null 2>&1; then
	echo "Node.js is required but not found. Install Node.js first: https://nodejs.org/en/download/" >&2
	exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
	echo "npm is required but not found. Install npm first: https://www.npmjs.com/get-npm" >&2
	exit 1
fi
# Install Node.js dependencies if package.json exists
if [ -f "package.json" ]; then
	echo "Installing Node.js dependencies..."
	npm install
fi

PULL=0
PUSH=0
NO_UP=0
ENV_FILE_ARG=""
GHCR_USER_ARG=""
GHCR_TOKEN_ARG=""
APP_DIR_ARG=""
args=()
while [ $# -gt 0 ]; do
	case "$1" in
		--pull) PULL=1; shift ;;
		--push) PUSH=1; shift ;;
		--no-up) NO_UP=1; shift ;;
		--env-file) ENV_FILE_ARG="${2:-}"; shift 2 ;;
		--env-file=*) ENV_FILE_ARG="${1#*=}"; shift ;;
		--ghcr-user) GHCR_USER_ARG="${2:-}"; shift 2 ;;
		--ghcr-user=*) GHCR_USER_ARG="${1#*=}"; shift ;;
		--ghcr-token) GHCR_TOKEN_ARG="${2:-}"; shift 2 ;;
		--ghcr-token=*) GHCR_TOKEN_ARG="${1#*=}"; shift ;;
		--app-dir) APP_DIR_ARG="${2:-}"; shift 2 ;;
		--app-dir=*) APP_DIR_ARG="${1#*=}"; shift ;;
		-h|--help) usage; exit 0 ;;
		# Any other -*/--* flag is unrecognized — fail fast instead of
		# silently treating it as the site URL.
		-*) echo "Unknown option: $1" >&2; usage; exit 1 ;;
		*) args+=("$1"); shift ;;
	esac
done
if [ "${#args[@]}" -gt 0 ]; then
	set -- "${args[@]}"
else
	set --
fi

# Optional dotenv-style file (.env.local/.env.prod/etc.) used as a fallback
# source (tier 4) — see usage() above for the full 5-tier chain. Never
# overrides a CLI flag/positional arg, an already-exported env var, or this
# script's own persisted state ($ENV_FILE). Missing file is not an error.
export ENV_FILE_PATH="${ENV_FILE_ARG:-${ENV_FILE_PATH:-.env.local}}"
[ -f "$ENV_FILE_PATH" ] && echo "==> Using settings file (fallback only): $ENV_FILE_PATH"

SITE_URL_DEFAULT="https://rohitkumar.skytech.in"
NEXT_PUBLIC_SITE_URL="$(resolve_setting "${1:-}" NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_SITE_URL)"
if [ -z "$NEXT_PUBLIC_SITE_URL" ] && [ -t 0 ]; then
	read -p "NEXT_PUBLIC_SITE_URL [$SITE_URL_DEFAULT]: " NEXT_PUBLIC_SITE_URL
fi
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$SITE_URL_DEFAULT}"
echo "==> Site URL: $NEXT_PUBLIC_SITE_URL"

# Ask before creating or updating the env file that docker-compose's
# env_file (MONGODB_URI/AUTH_SECRET) will load — never silent, always asks,
# and only runs at all in an interactive terminal.
if [ -t 0 ]; then
	if [ ! -f "$ENV_FILE_PATH" ]; then
		read -p "==> $ENV_FILE_PATH not found. Create it now? [Y/n] " create_ans
		if [ -z "$create_ans" ] || [[ "$create_ans" =~ ^[Yy] ]]; then
		  target="local"
      [ "$(basename "$ENV_FILE_PATH")" = ".env.prod" ] && target="prod"
			npm run --silent env:create -- "$target"
		fi
	else
		read -p "==> $ENV_FILE_PATH already exists. Update it now? [y/N] " update_ans
		if [[ "$update_ans" =~ ^[Yy] ]]; then
		  target="local"
      [ "$(basename "$ENV_FILE_PATH")" = ".env.prod" ] && target="prod"
			npm run --silent env:create -- "$target"
		fi
	fi
else
  echo "WARNING: Non interactive terminal — docker-compose's env_file will be missing; run: npm run env:create" >&2
fi

APP_DIR_DEFAULT="/opt/portfolio"
APP_DIR="$(resolve_setting "$APP_DIR_ARG" APP_DIR APP_DIR APP_DIR)"
if [ -z "$APP_DIR" ] && [ -t 0 ]; then
	read -p "APP_DIR [$APP_DIR_DEFAULT]: " APP_DIR
fi
export APP_DIR="${APP_DIR:-$APP_DIR_DEFAULT}"
echo "==> App dir: $APP_DIR"

# Persist the resolved values so a bare re-run remembers them (tier 3 above).
set_env_var NEXT_PUBLIC_SITE_URL "$NEXT_PUBLIC_SITE_URL"
set_env_var APP_DIR "$APP_DIR"

ADMIN_USERS_FILE="./secrets/admin-users.json"
if ! json_array_nonempty "$ADMIN_USERS_FILE"; then
	if [ -t 0 ]; then
		echo "==> No /admin login configured yet ($ADMIN_USERS_FILE); creating one now:"
		npm run --silent admin:create
	fi
	if ! json_array_nonempty "$ADMIN_USERS_FILE"; then
		echo "WARNING: $ADMIN_USERS_FILE has no admin users yet; /admin will be unreachable until you run: npm run admin:create" >&2
	fi
fi

if ! command -v docker >/dev/null 2>&1; then
	echo "Docker is required but not found. Install Docker Desktop/Engine first: https://docs.docker.com/get-docker/" >&2
	exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
	echo "The 'docker compose' plugin is required but not found." >&2
	exit 1
fi
if ! docker info >/dev/null 2>&1; then
	echo "Docker daemon is not running. Start Docker and re-run this script." >&2
	exit 1
fi

if [ "$PULL" -eq 1 ] && [ "$PUSH" -eq 1 ]; then
	echo "Use either --pull or --push, not both." >&2
	exit 1
fi

if [ "$PULL" -eq 1 ] || [ "$PUSH" -eq 1 ]; then
	IMAGE="$(resolve_setting "${IMAGE:-}" IMAGE IMAGE IMAGE)"
	flag="--pull"; [ "$PUSH" -eq 1 ] && flag="--push"
	if [ -z "${IMAGE:-}" ] && [ -t 0 ]; then
		read -p "Registry image for $flag (e.g. ghcr.io/<owner>/rohit-portfolio:latest): " IMAGE
	fi
	if [ -z "${IMAGE:-}" ]; then
		echo "$flag requires IMAGE to be set to a registry reference, e.g.:" >&2
		echo "  IMAGE=ghcr.io/<owner>/rohit-portfolio:latest $0 $flag" >&2
		exit 1
	fi
	export IMAGE
fi
# Only persist IMAGE once it's confirmed non-empty (validated above) — never
# write a blank value over a previously good one in $ENV_FILE.
[ -n "${IMAGE:-}" ] && set_env_var IMAGE "$IMAGE"

if [ "$PULL" -eq 1 ]; then
	echo "==> Pulling image: ${IMAGE}..."
	docker compose pull web
else
	echo "==> Building image: ${IMAGE:-rohit-portfolio:latest}..."
	docker compose build

	if [ "$PUSH" -eq 1 ]; then
		# Registry host is everything before the first "/" in the image ref
		# (e.g. "ghcr.io" out of "ghcr.io/<owner>/rohit-portfolio:latest").
		registry="${IMAGE%%/*}"
		# Optional convenience auto-login: CLI flag -> env var -> .env file ->
		# (only if NOT already logged in to this registry) interactive prompt
		# -> skip login silently. `docker compose push` will then fail with
		# its own clear auth error if login actually was required.
		GHCR_USER="${GHCR_USER_ARG:-${GHCR_USER:-$(env_file_var GHCR_USER)}}"
		GHCR_TOKEN="${GHCR_TOKEN_ARG:-${GHCR_TOKEN:-$(env_file_var GHCR_TOKEN)}}"

		# Best-effort check: does docker's config already have an auth entry
		# for this registry? (covers a prior `docker login`, a credential
		# helper, or CI runners that pre-authenticate.) Not 100% conclusive,
		# but enough to avoid nagging when login isn't actually needed.
		already_logged_in() {
			local cfg="${DOCKER_CONFIG:-$HOME/.docker}/config.json"
			[ -f "$cfg" ] && grep -q "\"$1\"" "$cfg" 2>/dev/null
		}

		if { [ -z "${GHCR_USER:-}" ] || [ -z "${GHCR_TOKEN:-}" ]; } && ! already_logged_in "$registry" && [ -t 0 ]; then
			echo "==> Not logged in to ${registry} yet."
			[ -z "${GHCR_USER:-}" ] && read -p "Registry username (leave blank to skip login): " GHCR_USER
			if [ -n "${GHCR_USER:-}" ] && [ -z "${GHCR_TOKEN:-}" ]; then
				read -s -p "Registry token/password: " GHCR_TOKEN
				echo ""
			fi
		fi

		if [ -n "${GHCR_USER:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
			echo "==> Logging in to ${registry}..."
			echo "$GHCR_TOKEN" | docker login "$registry" -u "$GHCR_USER" --password-stdin
		fi
		echo "==> Pushing image: ${IMAGE}..."
		docker compose push web

		# Keep ":latest" pointing at the newest push while still preserving
		# this specific tag for rollback — skipped if IMAGE already is
		# tagged "latest".
		image_tag="${IMAGE##*:}"
		if [ "$image_tag" != "latest" ]; then
			latest_image="${IMAGE%:*}:latest"
			echo "==> Tagging and pushing ${latest_image}..."
			docker tag "$IMAGE" "$latest_image"
			docker push "$latest_image"
		fi
	fi
fi

if [ "$NO_UP" -eq 1 ]; then
	echo "==> --no-up set: skipping 'docker compose up -d' and health check. Image is ready; start the stack yourself when ready."
	exit 0
fi

echo "==> Starting web..."
docker compose up -d

echo -n "==> Waiting for 'web' to be healthy"
elapsed=0
while [ "$elapsed" -lt "$HEALTH_TIMEOUT" ]; do
	status="$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q web)" 2>/dev/null || echo unknown)"
	if [ "$status" = "healthy" ]; then
		echo " OK"
		echo "==> Running at http://${HOST_BIND:-127.0.0.1}:${HOST_PORT:-3000} — point your reverse proxy here"
		exit 0
	fi
	echo -n "."
	sleep 3
	elapsed=$((elapsed + 3))
done

echo " TIMEOUT"
echo "See: docker compose logs web" >&2
exit 1
