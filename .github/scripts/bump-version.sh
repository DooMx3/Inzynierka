#!/usr/bin/env bash
# Resolve next version x.y.z from git tags (no commits to main).
#
# Developer tags:  vX.Y     → next version is X.Y.0
# CI release tags: vX.Y.Z   → source of truth for the last release
#
# On a normal main push (no new vX.Y in the range): take latest release and z += 1.
set -euo pipefail

BEFORE_SHA="${1:-}"

normalize_tag() {
  local tag="$1"
  if [[ "$tag" =~ ^v([0-9]+)\.([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.0"
    return 0
  fi
  if [[ "$tag" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.${BASH_REMATCH[3]}"
    return 0
  fi
  return 1
}

# Two-component tags only (v1.2) — developers use these to bump x/y.
parse_xy_bump() {
  local tag="$1"
  if [[ "$tag" =~ ^v([0-9]+)\.([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}.${BASH_REMATCH[2]}"
    return 0
  fi
  return 1
}

latest_release() {
  local v
  while IFS= read -r tag; do
    [[ -z "$tag" ]] && continue
    if v="$(normalize_tag "$tag")"; then
      echo "$v"
    fi
  done < <(git tag -l 'v*' 2>/dev/null || true) \
    | sort -t. -k1,1n -k2,2n -k3,3n \
    | tail -1
}

# Newest vX.Y tag on commits introduced by this push.
xy_from_push=""
if [[ -n "$BEFORE_SHA" && "$BEFORE_SHA" != "0000000000000000000000000000000000000000" ]]; then
  while IFS= read -r commit; do
    while IFS= read -r tag; do
      [[ -z "$tag" ]] && continue
      if xy="$(parse_xy_bump "$tag")"; then
        xy_from_push="$xy"
        break 2
      fi
    done < <(git tag --points-at "$commit" 2>/dev/null || true)
  done < <(git rev-list "${BEFORE_SHA}..HEAD" 2>/dev/null || true)
else
  while IFS= read -r tag; do
    [[ -z "$tag" ]] && continue
    if xy="$(parse_xy_bump "$tag")"; then
      xy_from_push="$xy"
      break
    fi
  done < <(git tag --points-at HEAD 2>/dev/null || true)
fi

if [[ -n "$xy_from_push" ]]; then
  echo "${xy_from_push}.0"
  exit 0
fi

current="$(latest_release)"
if [[ -z "$current" ]]; then
  echo "0.1.0"
  exit 0
fi

IFS=. read -r x y z <<<"$current"
echo "${x}.${y}.$((z + 1))"
