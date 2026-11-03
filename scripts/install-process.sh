#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
for process_patch in patches/feature-adr-next-paths.patch patches/dz-name-check-app-source.patch; do
if git apply --check "$process_patch" 2>/dev/null; then
  git apply "$process_patch"
elif ! git apply --reverse --check "$process_patch" 2>/dev/null; then
  echo "Не удалось применить проектный patch: $process_patch" >&2
  exit 1
fi
done
node node_modules/@dzhechkov/harness-cli/dist/bin.js init --target codex --force --preset feature-adr --project . --skills-dir node_modules/@dzhechkov/skills-feature-adr/templates/.claude/skills --no-integrations --no-hooks
node --test tests/feature-adr-paths.test.mjs
