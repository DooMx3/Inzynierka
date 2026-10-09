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

if ! "$runtime" compose version >/dev/null 2>&1; then
  echo "$runtime compose is not available" >&2
  exit 1
fi

echo "Stopping stack with $runtime compose..."
"$runtime" compose down
