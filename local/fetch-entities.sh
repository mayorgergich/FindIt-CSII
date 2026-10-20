#!/usr/bin/env bash
# Downloads Unity's com.unity.entities package (once) and keeps only its source generators,
# which the C# build needs for SystemAPI. The version must match the game's Unity.Entities.dll;
# the game's modding toolchain template (UnityModsProject.zip, Packages/manifest.json) names it.
set -euo pipefail

VERSION="${ENTITIES_VERSION:-1.3.10}"
DEST="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.tools/entities-$VERSION"

[[ -f "$DEST/SourceGenerators/SystemGenerator.dll" ]] && exit 0

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -sSfL -o "$tmp/entities.tgz" "https://download.packages.unity.com/com.unity.entities/-/com.unity.entities-$VERSION.tgz"
tar -xzf "$tmp/entities.tgz" -C "$tmp" package/Unity.Entities/SourceGenerators
mkdir -p "$DEST"
rm -rf "$DEST/SourceGenerators"
mv "$tmp/package/Unity.Entities/SourceGenerators" "$DEST/"
rm -rf "$DEST/SourceGenerators/Source~"
echo "Fetched Unity Entities $VERSION source generators"
