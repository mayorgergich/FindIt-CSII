#!/usr/bin/env bash
# Keeps the local Find It following the author's releases.
#
# When the author's GitHub main moves, this rebases the local commits onto it in a scratch
# worktree, builds there, and only if everything succeeds moves the "local" branch and deploys.
# If the local changes no longer apply or the build fails, the deployed copy is left untouched
# and a desktop notification says so. Nothing happens while the game is running.
#
# Run by findit-local-update.timer (systemd --user), or by hand: local/update-check.sh [--force]
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$REPO/local/.state"
LOG="$STATE/update.log"
WT="$REPO/.update-worktree"
USERDATA="$HOME/.local/share/Steam/steamapps/compatdata/949230/pfx/drive_c/users/steamuser/AppData/LocalLow/Colossal Order/Cities Skylines II"
mkdir -p "$STATE"

log() { printf '%s %s\n' "$(date -Is)" "$*" >>"$LOG"; }
notify() {
	log "NOTIFY: $1"
	notify-send -a "Find It (local)" -i system-software-update "Find It" "$1" 2>/dev/null || true
}
cleanup() {
	git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1 || rm -rf "$WT"
	git -C "$REPO" worktree prune >/dev/null 2>&1 || true
}

cd "$REPO" || exit 1

if [[ -n "$(git status --porcelain)" ]]; then
	log "skipped: the working copy has uncommitted changes"
	exit 0
fi

if ! git fetch -q upstream 2>>"$LOG"; then
	log "skipped: could not reach GitHub"
	exit 0
fi

base="$(git merge-base local upstream/main)"
new="$(git rev-parse upstream/main)"

if [[ "$base" == "$new" && "${1:-}" != "--force" ]]; then
	log "up to date with upstream ${new:0:7}"
	exit 0
fi

if pgrep -f 'Cities2.ex[e]' >/dev/null; then
	log "update ${new:0:7} waiting: the game is running"
	exit 0
fi

new_version="$(git show "$new:FindIt/Changelog.json" | python3 -I -c 'import json,sys; print(json.loads(sys.stdin.read().lstrip("﻿"))[0]["Version"])' 2>/dev/null || echo "?")"
log "upstream moved ${base:0:7} -> ${new:0:7} (version $new_version)"

# 1. Rebase in a scratch worktree.
cleanup
git worktree add -q --detach "$WT" local 2>>"$LOG" || { log "worktree failed"; exit 1; }
if ! git -C "$WT" -c user.name="Local build" -c user.email="local@localhost" rebase -q upstream/main >>"$LOG" 2>&1; then
	git -C "$WT" rebase --abort >/dev/null 2>&1
	cleanup
	notify "Find It $new_version is out, but your local changes no longer fit it. Your current copy keeps working. Ask Claude to update Find It."
	exit 0
fi

# 2. Build there. Reuse node_modules unless the author changed the UI's dependencies.
if git diff --quiet "$base" "$new" -- FindIt/UI/package-lock.json; then
	ln -sfn "$REPO/FindIt/UI/node_modules" "$WT/FindIt/UI/node_modules"
fi
ln -sfn ../../FindIt/UI/node_modules "$WT/local/ui/node_modules"
[[ -d "$REPO/local/.tools" ]] && ln -sfn "$REPO/local/.tools" "$WT/local/.tools"

if ! "$WT/local/build.sh" >>"$LOG" 2>&1; then
	cleanup
	notify "Find It $new_version is out, but the local copy didn't build with it. Your current copy keeps working. Ask Claude to update Find It."
	exit 0
fi

# 3. Check that every binding and trigger the dock UI uses still exists on the C# side.
ui_names="$(grep -rhoE '(bindValue<[^>]*>\(\s*(B\.)?G,\s*|trigger\(\s*B\.G,\s*)"[A-Za-z]+"' "$WT/local/ui/src" | grep -oE '"[A-Za-z]+"' | tr -d '"' | sort -u)"
cs_names="$(grep -rhoE 'Create(Binding|Trigger)(<[^>]*>)?\("[A-Za-z]+"(, "[A-Za-z]+")?' "$WT/FindIt" "$WT/local/src" | grep -oE '"[A-Za-z]+"' | tr -d '"' | sort -u)"
missing="$(comm -23 <(printf '%s\n' "$ui_names") <(printf '%s\n' "$cs_names") | tr '\n' ' ')"

# 4. Adopt: keep a backup of the old branch, move "local" to the rebased commit, deploy.
if pgrep -f 'Cities2.ex[e]' >/dev/null; then
	cleanup
	log "update ${new:0:7} built but not deployed: the game started meanwhile"
	exit 0
fi

git branch -f "local-backup-$(date +%Y%m%d-%H%M)" local >/dev/null
git reset -q --hard "$(git -C "$WT" rev-parse HEAD)"
cleanup

if ! "$REPO/local/build.sh" --deploy >>"$LOG" 2>&1; then
	notify "Find It $new_version: the rebuilt copy could not be installed. Ask Claude to look at local/.state/update.log."
	exit 0
fi

message="Find It updated to $new_version, with your dock layout. Restart the game to use it."
if ! git diff --quiet "$base" "$new" -- FindIt/UI/src; then
	message="$message The author also changed the original interface; ask Claude whether anything new should be added to the dock."
fi
if [[ -n "${missing// /}" ]]; then
	message="$message Some dock features may not work: $missing. Ask Claude to check."
fi
notify "$message"

# Note for the record which official version Paradox Mods has (the launcher keeps that copy too).
official="$(cp "$USERDATA/launcher-v2.sqlite" "$STATE/l2.sqlite" 2>/dev/null && sqlite3 -readonly "$STATE/l2.sqlite" "select version from mods where pdxId='77240' limit 1;" 2>/dev/null; rm -f "$STATE/l2.sqlite")"
log "deployed $new_version (upstream ${new:0:7}); Paradox Mods copy is ${official:-unknown}"
