#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOCTL="${ROOT}/bin/doctl"
APP_NAME="secondbeat-api-staging"
SPEC="${ROOT}/.do/app.generated.yaml"
APP_ID_FILE="${ROOT}/.do/app-id.staging"

ensure_doctl() {
  if [[ -x "$DOCTL" ]]; then
    return
  fi
  mkdir -p "${ROOT}/bin"
  echo "Downloading doctl..."
  curl -sL "https://github.com/digitalocean/doctl/releases/download/v1.118.0/doctl-1.118.0-darwin-arm64.tar.gz" \
    -o /tmp/doctl.tar.gz
  tar -xzf /tmp/doctl.tar.gz -C "${ROOT}/bin" doctl
  chmod +x "$DOCTL"
}

auth_doctl() {
  local token="${DIGITALOCEAN_ACCESS_TOKEN:-}"
  if [[ -z "$token" && -f "${ROOT}/.env" ]]; then
    token="$(grep -E '^DIGITALOCEAN_ACCESS_TOKEN=' "${ROOT}/.env" | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
  fi
  if [[ -z "$token" && -f "${ROOT}/.env.staging" ]]; then
    token="$(grep -E '^DIGITALOCEAN_ACCESS_TOKEN=' "${ROOT}/.env.staging" | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
  fi
  if [[ -z "$token" && -f "${ROOT}/.do/access_token" ]]; then
    token="$(cat "${ROOT}/.do/access_token")"
  fi
  if [[ -z "$token" ]]; then
    echo "Set DIGITALOCEAN_ACCESS_TOKEN in .env.staging, .env, or .do/access_token"
    echo "Create a token: https://cloud.digitalocean.com/account/api/tokens"
    exit 1
  fi
  "$DOCTL" auth init --access-token "$token" >/dev/null
}

render_spec() {
  node scripts/render-do-app-spec.mjs
}

find_app_id() {
  if [[ -f "$APP_ID_FILE" ]]; then
    cat "$APP_ID_FILE"
    return
  fi
  "$DOCTL" apps list --format ID,Spec.Name --no-header | awk -v name="$APP_NAME" '$2 == name { print $1; exit }'
}

deploy_app() {
  local app_id
  app_id="$(find_app_id || true)"

  if [[ -z "$app_id" ]]; then
    echo "Creating App Platform app: $APP_NAME"
    create_out="$("$DOCTL" apps create --spec "$SPEC" --format ID --no-header 2>&1)" || {
      if echo "$create_out" | grep -qi 'GitHub user not authenticated'; then
        echo ""
        echo "Link GitHub to DigitalOcean, then re-run: npm run deploy:staging"
        echo "  https://cloud.digitalocean.com/account/github"
        echo "  Grant access to Devsecondbeat/server"
        exit 1
      fi
      echo "$create_out"
      exit 1
    }
    app_id="$create_out"
    echo "$app_id" > "$APP_ID_FILE"
    echo "Created app id: $app_id"
  else
    echo "Updating App Platform app: $app_id"
    "$DOCTL" apps update "$app_id" --spec "$SPEC" --format ID --no-header >/dev/null
    echo "$app_id" > "$APP_ID_FILE"
  fi

  echo "Triggering deployment..."
  "$DOCTL" apps create-deployment "$app_id" >/dev/null

  echo "Waiting for active deployment (up to 10 minutes)..."
  local i=0
  while [[ $i -lt 60 ]]; do
    local phase
    phase="$("$DOCTL" apps list-deployments "$app_id" --format Phase --no-header | head -1)"
    if [[ "$phase" == "ACTIVE" ]]; then
      echo "Deployment ACTIVE"
      break
    fi
    if [[ "$phase" == "ERROR" || "$phase" == "CANCELED" ]]; then
      echo "Deployment failed with phase: $phase"
      "$DOCTL" apps logs "$app_id" --type build --tail 50 || true
      "$DOCTL" apps logs "$app_id" --type run --tail 50 || true
      exit 1
    fi
    sleep 10
    i=$((i + 1))
  done

  local url
  url="$("$DOCTL" apps get "$app_id" --format DefaultIngress --no-header)"
  echo "App URL: https://${url}"

  echo "Smoke tests:"
  curl -sS "https://${url}/health"
  echo ""
  curl -sS "https://${url}/health/database"
  echo ""
}

ensure_doctl
auth_doctl
render_spec
deploy_app
