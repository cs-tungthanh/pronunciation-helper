#!/usr/bin/env bash
# Bump the version, commit it to main, and push a matching tag; the tag starts the Publish workflow.
# Usage: scripts/release.sh [patch|minor|major]   (default: patch)
set -euo pipefail

cd "$(dirname "$0")/.."

TYPE="${1:-patch}"
if [[ ! "$TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: scripts/release.sh [patch|minor|major]" >&2
  exit 1
fi

# Release only what is already on origin/main, so the tag points at reviewed code
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Switch to main before releasing." >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit or stash your changes before releasing." >&2
  exit 1
fi
git fetch --quiet origin main --tags
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo "Local main differs from origin/main; pull or push first." >&2
  exit 1
fi

# Catch type errors here rather than after the tag is pushed
pnpm run --silent type-check

CURRENT=$(node -p "require('./manifest.json').version")
pnpm run --silent "version:$TYPE" > /dev/null
VERSION=$(node -p "require('./manifest.json').version")
TAG="v$VERSION"

if git rev-parse --quiet --verify "refs/tags/$TAG" > /dev/null; then
  git checkout -- manifest.json package.json
  echo "Tag $TAG already exists." >&2
  exit 1
fi

read -r -p "Release $CURRENT → $VERSION and publish to the Chrome Web Store? [y/N] " answer
if [[ ! "$answer" =~ ^[Yy]$ ]]; then
  git checkout -- manifest.json package.json
  echo "Cancelled; version left at $CURRENT."
  exit 0
fi

git add manifest.json package.json
git commit --quiet -m "chore: release $TAG"
git tag "$TAG"
git push --quiet origin main
git push --quiet origin "$TAG"

echo "Pushed $TAG; the Publish workflow is starting:"
echo "  https://github.com/cs-tungthanh/sayly/actions/workflows/publish.yml"
