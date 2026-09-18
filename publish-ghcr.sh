#!/usr/bin/env bash
# Builds and pushes the portfolio image to GitHub Container Registry (GHCR).
# Delegates to the same `docker compose build`/`docker compose push` commands
# `deploy.sh --push` uses (docker-compose.yml's `image: ${IMAGE}` build
# target reads the IMAGE/NEXT_PUBLIC_SITE_URL env vars set below) — so there
# is only one place that knows how to build/tag this image, not two.
#
# Unlike `deploy.sh --push`, this does NOT start the container afterwards —
# use this from a machine that isn't the deploy target itself (e.g. your
# laptop, or CI), then run `deploy.sh --pull` on the actual server. If you're
# building directly on the server and also want it running there, use
# `deploy.sh --push` instead of this script.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

usage() {
	cat <<EOF
Usage: $0 [OPTIONS]

Publishes the portfolio image to GHCR. Every setting below can come from
three input sources, tried in this order (first match wins):

  1. CLI flag        e.g. --owner myuser
  2. Environment var  e.g. export GITHUB_OWNER=myuser
     or .env file      same KEY=VALUE, read from --env-file/\$ENV_FILE_PATH
                       (default: .env.local, silently skipped if missing)
  3. Interactive prompt (only asked when stdin is a real terminal — never
     hangs in CI/non-interactive runs)
  4. Hardcoded default, or a hard error if the setting has no safe default

Options (CLI flag | env var / .env key | default):
  --owner OWNER        | GITHUB_OWNER        | (none — required)
  --token PAT          | GITHUB_TOKEN        | (none — required, needs 'write:packages' scope)
  --image-name NAME    | IMAGE_NAME          | rohit-portfolio
  --tag TAG            | IMAGE_TAG           | latest
  --site-url URL       | NEXT_PUBLIC_SITE_URL| https://rohitkumar.skytech.in
  --app-dir DIR        | APP_DIR             | /app
  --env-file PATH      | ENV_FILE_PATH       | .env.local
  -h, --help           Show this help and exit

Examples:
  $0 --owner myuser --tag v1.2.0
  GITHUB_OWNER=myuser GITHUB_TOKEN=ghp_xxx $0 --tag v1.2.0   # no prompts at all
  $0 --env-file .env.prod                                    # load settings from a file
  echo "GITHUB_OWNER=myuser" >> .env.local && $0              # same idea, default file

Security note: prefer passing GITHUB_TOKEN via a real environment variable
(or CI secret) rather than storing it in a file. If you do put it in
--env-file, keep that file out of version control (.env* is gitignored here).
EOF
}

OWNER_ARG=""
TOKEN_ARG=""
IMAGE_NAME_ARG=""
IMAGE_TAG_ARG=""
SITE_URL_ARG=""
APP_DIR_ARG=""
ENV_FILE_ARG=""
while [ $# -gt 0 ]; do
	case "$1" in
		--owner) OWNER_ARG="${2:-}"; shift 2 ;;
		--owner=*) OWNER_ARG="${1#*=}"; shift ;;
		--token) TOKEN_ARG="${2:-}"; shift 2 ;;
		--token=*) TOKEN_ARG="${1#*=}"; shift ;;
		--image-name) IMAGE_NAME_ARG="${2:-}"; shift 2 ;;
		--image-name=*) IMAGE_NAME_ARG="${1#*=}"; shift ;;
		--tag) IMAGE_TAG_ARG="${2:-}"; shift 2 ;;
		--tag=*) IMAGE_TAG_ARG="${1#*=}"; shift ;;
		--site-url) SITE_URL_ARG="${2:-}"; shift 2 ;;
		--site-url=*) SITE_URL_ARG="${1#*=}"; shift ;;
		--app-dir) APP_DIR_ARG="${2:-}"; shift 2 ;;
		--app-dir=*) APP_DIR_ARG="${1#*=}"; shift ;;
		--env-file) ENV_FILE_ARG="${2:-}"; shift 2 ;;
		--env-file=*) ENV_FILE_ARG="${1#*=}"; shift ;;
		-h|--help) usage; exit 0 ;;
		*) echo "Unknown option: $1" >&2; usage; exit 1 ;;
	esac
done

# Optional dotenv-style file (.env.local/.env.prod/etc.) used as a fallback
# source, below real environment variables but above interactive prompts.
# Never overrides a CLI flag or an already-exported env var. Missing file is
# not an error — it's simply skipped.
ENV_FILE_PATH="${ENV_FILE_ARG:-${ENV_FILE_PATH:-.env.local}}"
env_file_var() {
	local key="$1"
	[ -f "$ENV_FILE_PATH" ] && grep -E "^${key}=" "$ENV_FILE_PATH" | tail -n1 | cut -d= -f2- || true
}

echo "=== Publish rohit-portfolio to GitHub Container Registry (GHCR) ==="
[ -f "$ENV_FILE_PATH" ] && echo "==> Using settings file (fallback only): $ENV_FILE_PATH"
echo ""

# Each setting resolves as: CLI flag -> environment variable -> .env file ->
# interactive prompt (only in a real terminal) -> hardcoded default/error.
# This lets the script run fully non-interactively (CI) when flags/env vars
# are supplied, while still guiding a human through any gaps when run by hand.
GITHUB_OWNER="${OWNER_ARG:-${GITHUB_OWNER:-$(env_file_var GITHUB_OWNER)}}"
if [ -z "$GITHUB_OWNER" ] && [ -t 0 ]; then
	read -p "GitHub username or org (GHCR owner): " GITHUB_OWNER
fi
if [ -z "$GITHUB_OWNER" ]; then
	echo "GitHub owner is required (pass --owner, set GITHUB_OWNER, add it to $ENV_FILE_PATH, or run interactively)." >&2
	exit 1
fi

GITHUB_TOKEN="${TOKEN_ARG:-${GITHUB_TOKEN:-$(env_file_var GITHUB_TOKEN)}}"
if [ -z "$GITHUB_TOKEN" ] && [ -t 0 ]; then
	read -s -p "GitHub Personal Access Token (needs 'write:packages' scope): " GITHUB_TOKEN
	echo ""
fi
if [ -z "$GITHUB_TOKEN" ]; then
	echo "A PAT is required (pass --token, set GITHUB_TOKEN, add it to $ENV_FILE_PATH, or run interactively)." >&2
	exit 1
fi

IMAGE_NAME="${IMAGE_NAME_ARG:-${IMAGE_NAME:-$(env_file_var IMAGE_NAME)}}"
if [ -z "$IMAGE_NAME" ] && [ -t 0 ]; then
	read -p "Image name [rohit-portfolio]: " IMAGE_NAME
fi
IMAGE_NAME="${IMAGE_NAME:-rohit-portfolio}"

IMAGE_TAG="${IMAGE_TAG_ARG:-${IMAGE_TAG:-$(env_file_var IMAGE_TAG)}}"
if [ -z "$IMAGE_TAG" ] && [ -t 0 ]; then
	read -p "Image tag [latest]: " IMAGE_TAG
fi
IMAGE_TAG="${IMAGE_TAG:-latest}"

SITE_URL="${SITE_URL_ARG:-${NEXT_PUBLIC_SITE_URL:-$(env_file_var NEXT_PUBLIC_SITE_URL)}}"
if [ -z "$SITE_URL" ] && [ -t 0 ]; then
	read -p "NEXT_PUBLIC_SITE_URL [https://rohitkumar.skytech.in]: " SITE_URL
fi
SITE_URL="${SITE_URL:-https://rohitkumar.skytech.in}"

APP_DIR="${APP_DIR_ARG:-${APP_DIR:-$(env_file_var APP_DIR)}}"
if [ -z "$APP_DIR" ] && [ -t 0 ]; then
	read -p "APP_DIR [/portfolio]: " APP_DIR
fi
APP_DIR="${APP_DIR:-/portfolio}"

# All three consumed by docker-compose.yml: IMAGE sets the `image:` tag used
# for build/push, NEXT_PUBLIC_SITE_URL and APP_DIR are forwarded as build args.
export IMAGE="ghcr.io/${GITHUB_OWNER}/${IMAGE_NAME}:${IMAGE_TAG}"
export NEXT_PUBLIC_SITE_URL="$SITE_URL"
export APP_DIR="$APP_DIR"

echo ""
echo "==> Logging in to ghcr.io as ${GITHUB_OWNER}..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_OWNER" --password-stdin

echo ""
echo "==> Building ${IMAGE}..."
docker compose build

echo ""
echo "==> Pushing ${IMAGE}..."
docker compose push web

# Keep `:latest` pointing at the newest push while still preserving this
# specific tag for rollback — skipped if the user already chose "latest".
if [ "$IMAGE_TAG" != "latest" ]; then
	LATEST_IMAGE="ghcr.io/${GITHUB_OWNER}/${IMAGE_NAME}:latest"
	echo ""
	echo "==> Tagging and pushing ${LATEST_IMAGE}..."
	docker tag "$IMAGE" "$LATEST_IMAGE"
	docker push "$LATEST_IMAGE"
fi

echo ""
echo "==> Published: $IMAGE"
if [ "$IMAGE_TAG" != "latest" ]; then
	echo "==> Also published: ghcr.io/${GITHUB_OWNER}/${IMAGE_NAME}:latest"
fi
echo "==> On the deploy target, run:"
echo "      IMAGE=$IMAGE ./deploy.sh --pull"
