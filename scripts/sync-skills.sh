#!/usr/bin/env bash
#
# sync-skills.sh — install/update this repo's skills into a local Claude Code
# skills directory, keeping them matched.
#
# Safe by design: it only ever touches skills THIS REPO owns (the top-level
# directories tracked here that contain a SKILL.md). It never deletes or
# overwrites anything else in the target — so a shared skills dir (e.g. a live
# PAI/LifeOS install) is left untouched.
#
# Usage:
#   scripts/sync-skills.sh                 # preview ALL skills (dry run — default)
#   scripts/sync-skills.sh --apply         # install/update ALL skills
#   scripts/sync-skills.sh blog-writer     # preview just blog-writer
#   scripts/sync-skills.sh blog-writer --apply
#   scripts/sync-skills.sh --list          # list this repo's installable skills
#
# Flags:
#   --apply           Actually copy (default is a dry-run preview).
#   --target <dir>    Target skills dir (default: $CLAUDE_SKILLS_DIR or ~/.claude/skills).
#   --force           Overwrite a same-named skill this repo does NOT own
#                     (off by default — protects a shared/PAI install).
#   --list            List installable skills and exit.
#   -h, --help        This help.
#
set -euo pipefail

# --- locate the repo (this script lives in <repo>/scripts) -------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- defaults ----------------------------------------------------------------
TARGET="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
APPLY=0
FORCE=0
ONLY=""

# --- parse args --------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --apply)  APPLY=1 ;;
    --force)  FORCE=1 ;;
    --target) TARGET="${2:?--target needs a path}"; shift ;;
    --list)
      for d in "$REPO_DIR"/*/SKILL.md; do [ -e "$d" ] && basename "$(dirname "$d")"; done
      exit 0 ;;
    -h|--help)
      sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    -*)
      echo "sync-skills: unknown flag: $1" >&2; exit 2 ;;
    *)
      ONLY="$1" ;;
  esac
  shift
done

# --- discover this repo's installable skills (dirs with a SKILL.md) ----------
discover() {
  for d in "$REPO_DIR"/*/SKILL.md; do
    [ -e "$d" ] || continue
    basename "$(dirname "$d")"
  done
}

SKILLS=()
if [ -n "$ONLY" ]; then
  if [ ! -f "$REPO_DIR/$ONLY/SKILL.md" ]; then
    echo "sync-skills: '$ONLY' is not a skill in this repo (no $ONLY/SKILL.md)." >&2
    echo "Run 'scripts/sync-skills.sh --list' to see valid names." >&2
    exit 1
  fi
  SKILLS=("$ONLY")
else
  while IFS= read -r s; do SKILLS+=("$s"); done < <(discover)
fi

# --- header ------------------------------------------------------------------
mode=$([ "$APPLY" -eq 1 ] && echo "APPLY" || echo "DRY-RUN (preview only — pass --apply to write)")
echo "Repo:   $REPO_DIR"
echo "Target: $TARGET"
echo "Mode:   $mode"
echo "Skills: ${#SKILLS[@]}"
echo "--------------------------------------------------------------------------"

mkdir -p "$TARGET"

# An "ownership marker" lets us tell OUR installed skills apart from a
# same-named skill that was already there (e.g. from PAI). We drop a tiny
# hidden file on apply; refuse to overwrite a dir that lacks it unless --force.
MARKER=".synced-from-claude-skills"

changed=0
skipped=0
for s in "${SKILLS[@]}"; do
  src="$REPO_DIR/$s"
  dst="$TARGET/$s"

  # Protect a pre-existing, non-owned skill of the same name.
  if [ -d "$dst" ] && [ ! -e "$dst/$MARKER" ] && [ "$FORCE" -ne 1 ]; then
    echo "SKIP  $s — a different '$s' already exists in the target and wasn't installed by this tool."
    echo "      (use --force to overwrite it, or rename one.)"
    skipped=$((skipped+1))
    continue
  fi

  # rsync gives us a precise diff. --delete keeps the skill's OWN contents
  # matched (removes files deleted from the repo) but is scoped to this one
  # skill dir, never the whole target. node_modules etc. are excluded.
  rsync_opts=(-a --delete --exclude 'node_modules/' --exclude '.git/' --exclude "$MARKER" --itemize-changes)
  if [ "$APPLY" -eq 1 ]; then
    rsync "${rsync_opts[@]}" "$src/" "$dst/"
    echo "$MARKER" > "$dst/$MARKER" 2>/dev/null || true
    printf 'SYNC  %s -> %s\n' "$s" "$dst"
    changed=$((changed+1))
  else
    # dry run: show what WOULD change
    out="$(rsync "${rsync_opts[@]}" --dry-run "$src/" "$dst/" 2>/dev/null | grep -v '/$' || true)"
    if [ -n "$out" ]; then
      echo "WOULD SYNC  $s:"
      echo "$out" | sed 's/^/    /'
      changed=$((changed+1))
    else
      echo "OK    $s — already up to date"
    fi
  fi
done

echo "--------------------------------------------------------------------------"
if [ "$APPLY" -eq 1 ]; then
  echo "Done. $changed synced, $skipped skipped."
  echo "Start a new Claude Code session to pick up changes (skills load at startup)."
else
  echo "Preview: $changed would change, $skipped would be skipped."
  echo "Re-run with --apply to write. Nothing was modified."
fi
