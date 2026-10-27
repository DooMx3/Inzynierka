#!/usr/bin/env bash
# Resolve next VERSION (x.y.z):
# - if any commit in BEFORE..HEAD has a tag vX.Y or vX.Y.Z → use X.Y.0
#   (developers bump x/y by pushing a git tag with the commit)
# - otherwise → keep x.y from VERSION and z += 1
# CI owns z; developers own x/y via tags (e.g. v0.2.0).
set -euo pipefail

BEFORE_SHA="${1:-}"
VERSION_FILE="${VERSION_FILE:-VERSION}"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "0.0.0" > "$VERSION_FILE"
fi

current="$(tr -d '[:space:]' < "$VERSION_FILE")"
if [[ ! "$current" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid VERSION '$current' (expected x.y.z)" >&2
  exit 1
fi

IFS=. read -r cur_x cur_y cur_z <<<"$current"

parse_xy() {
  local tag="$1"
  if [[ "$tag" =~ ^v([0-9]+)\.([0-9]+)(\.([0-9]+))?$ ]]; then
    echo "${BASH_REMATCH[1]}.${BASH_REMATCH[2]}"
    return 0
  fi
  return 1
}

# Prefer the newest tagged commit in this push (rev-list is newest-first).
tag_xy=""
if [[ -n "$BEFORE_SHA" && "$BEFORE_SHA" != "0000000000000000000000000000000000000000" ]]; then
  while IFS= read -r commit; do
    while IFS= read -r tag; do
      [[ -z "$tag" ]] && continue
      if xy="$(parse_xy "$tag")"; then
        tag_xy="$xy"
        break 2
      fi
    done < <(git tag --points-at "$commit" 2>/dev/null || true)
  done < <(git rev-list "${BEFORE_SHA}..HEAD" 2>/dev/null || true)
else
  while IFS= read -r tag; do
    [[ -z "$tag" ]] && continue
    if xy="$(parse_xy "$tag")"; then
      tag_xy="$xy"
      break
    fi
  done < <(git tag --points-at HEAD 2>/dev/null || true)
fi

if [[ -n "$tag_xy" ]]; then
  new="${tag_xy}.0"
else
  new="${cur_x}.${cur_y}.$((cur_z + 1))"
fi

echo "$new" > "$VERSION_FILE"
echo "$new"
