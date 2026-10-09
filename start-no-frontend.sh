#!/bin/bash
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"
exec ./start.sh --no-frontend
