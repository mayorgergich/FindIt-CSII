#!/usr/bin/env bash
# Builds the local (never published) Linux copy of Find It and optionally deploys it.
#
#   local/build.sh            build into local/dist/FindIt
#   local/build.sh --deploy   build, then copy into the game's local Mods folder
#
# The official Paradox Mods copy (id 77240) must be switched OFF in the launcher while this
# copy is deployed; otherwise this copy stands aside at load (see local/src/LocalGuard.cs).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL="$ROOT/local"
DIST="$LOCAL/dist/FindIt"
GAME="$HOME/.local/share/Steam/steamapps/common/Cities Skylines II"
MANAGED="$GAME/Cities2_Data/Managed"
USERDATA="$HOME/.local/share/Steam/steamapps/compatdata/949230/pfx/drive_c/users/steamuser/AppData/LocalLow/Colossal Order/Cities Skylines II"
DEPLOY_DIR="$USERDATA/Mods/FindIt"

deploy=0
[[ "${1:-}" == "--deploy" ]] && deploy=1

# Version: upstream changelog version + local suffix with the upstream commit we're built on.
upstream_version="$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8-sig"))[0]["Version"])' "$ROOT/FindIt/Changelog.json")"
upstream_commit="$(git -C "$ROOT" merge-base HEAD upstream/main 2>/dev/null | cut -c1-7 || echo unknown)"
info_version="$upstream_version-local+$upstream_commit"
echo "== Find It $info_version"

# 1. Unity Entities source generators (matching the game's com.unity.entities version).
"$LOCAL/fetch-entities.sh"

# 2. Method-swap post-processor.
if [[ ! -f "$LOCAL/tools/DotsPatcher/bin/Release/net10.0/DotsPatcher.dll" || "$LOCAL/tools/DotsPatcher/Program.cs" -nt "$LOCAL/tools/DotsPatcher/bin/Release/net10.0/DotsPatcher.dll" ]]; then
	dotnet build "$LOCAL/tools/DotsPatcher/DotsPatcher.csproj" -c Release -nologo -v q
fi

# 3. C#. A failed build must stop here: never ship a stale FindIt.dll from an earlier build.
rm -f "$LOCAL/bin/Release/FindIt.dll"
if ! build_log="$(dotnet build "$LOCAL/FindIt.Local.csproj" -c Release -nologo -v q \
	-p:Version="$upstream_version" -p:InformationalVersion="$info_version" 2>&1)"; then
	printf '%s\n' "$build_log" | grep -E ' error ' | sort -u
	echo "C# build failed"
	exit 1
fi
[[ -f "$LOCAL/bin/Release/FindIt.dll" ]] || { echo "C# build produced no FindIt.dll"; exit 1; }
dotnet "$LOCAL/tools/DotsPatcher/bin/Release/net10.0/DotsPatcher.dll" "$LOCAL/bin/Release/FindIt.dll" "$MANAGED"

# 4. UI: the local dock UI (local/ui), built as the "FindItLocal" module with the author's toolchain.
pushd "$ROOT/FindIt/UI" >/dev/null
[[ -d node_modules ]] || npm ci --no-audit --no-fund
rm -rf "$DIST"
npx webpack --config ../../local/ui/webpack.ui.js
popd >/dev/null
[[ -f "$DIST/FindItLocal.mjs" ]] || { echo "UI build failed"; exit 1; }

# 5. Assemble the mod folder (same layout as the official package, minus Burst native libraries).
cp "$LOCAL/bin/Release/FindIt.dll" "$LOCAL/bin/Release/FindIt.pdb" "$DIST/"
mkdir -p "$DIST/images" "$DIST/.ail"
cp "$ROOT/FindIt/Resources/Images/"* "$DIST/images/"
cp "$ROOT/FindIt/Resources/AssetIcons/"* "$DIST/.ail/"
printf '%s\n' "$info_version" > "$DIST/LOCAL_BUILD.txt"
echo "== Built $DIST"

if (( deploy )); then
	if pgrep -f 'Cities2.ex[e]' >/dev/null; then
		echo "Cities: Skylines II is running; close it before deploying." >&2
		exit 1
	fi
	rm -rf "$DEPLOY_DIR.new"
	cp -r "$DIST" "$DEPLOY_DIR.new"
	rm -rf "$DEPLOY_DIR.old"
	[[ -d "$DEPLOY_DIR" ]] && mv "$DEPLOY_DIR" "$DEPLOY_DIR.old"
	mv "$DEPLOY_DIR.new" "$DEPLOY_DIR"
	rm -rf "$DEPLOY_DIR.old"
	echo "== Deployed to $DEPLOY_DIR"
fi
