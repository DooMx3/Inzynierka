#!/bin/bash
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"

if command -v podman >/dev/null 2>&1; then
  runtime=podman
elif command -v docker >/dev/null 2>&1; then
  runtime=docker
else
  echo "podman or docker is required" >&2
  exit 1
fi

compose() {
  "$runtime" compose "$@"
}

if ! compose version >/dev/null 2>&1; then
  echo "$runtime compose is not available" >&2
  exit 1
fi

if [[ "$runtime" == "podman" ]]; then
  socket="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/podman/podman.sock"
  if [[ ! -S "$socket" && -S /run/podman/podman.sock ]]; then
    socket=/run/podman/podman.sock
  fi
  if [[ ! -S "$socket" ]] && command -v systemctl >/dev/null 2>&1; then
    systemctl --user start podman.socket || true
  fi
  if [[ ! -S "$socket" && -S /run/podman/podman.sock ]]; then
    socket=/run/podman/podman.sock
  fi
  if [[ ! -S "$socket" ]]; then
    echo "Podman socket not found. Start it with: systemctl --user start podman.socket" >&2
    exit 1
  fi
  export DOCKER_HOST="unix://${socket}"
fi

no_frontend=0
if [[ "${1:-}" == "--no-frontend" ]]; then
  no_frontend=1
elif [[ -n "${1:-}" ]]; then
  echo "Unknown argument: $1" >&2
  exit 1
fi

echo "Building backend image with Maven ($runtime)..."
mvn -f backend/pom.xml spring-boot:build-image

if [[ "$no_frontend" == 1 ]]; then
  echo "Starting stack without frontend ($runtime compose)..."
  compose up -d postgres mailpit backend
else
  echo "Starting stack with $runtime compose..."
  compose up --build -d
  echo "Frontend: http://localhost:3000"
fi

echo "Backend:  http://localhost:8080"
echo "Mailpit:  http://localhost:8025"
