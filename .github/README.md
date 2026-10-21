# Find It for Cities: Skylines II: dock layout fork

> [!WARNING]
> **This is a vibe-coded project.** Everything this fork adds was written with AI (Anthropic's Claude). The code has **not been fully reviewed or verified** by a person. Use it at your own risk and keep backups of your saves.

This is a personal fork of [Find It for Cities: Skylines II](https://github.com/JadHajjar/FindIt-CSII) by **T. D. W.** (Jad Hajjar). It keeps everything Find It does and redesigns where its panel sits and how it's laid out.

It is **not** made or endorsed by the Find It author. It is **not** published on Paradox Mods, and none of it has been offered back to the original project. For the real mod, get Find It from Paradox Mods.

## What's different

- **A dock instead of a large centred panel.** A tall panel docked to the left or right edge of the screen, built from the game's own interface pieces so it looks native. Fold it down to its title bar when you don't need it.
- **Floating window.** Drag the title bar away from the edge and the dock comes loose. Resize it from its edges and corners. Drag it back to a screen edge to dock it again. Its size and position are remembered separately for each screen shape (for example a 16:9 monitor and a 4:3 tablet).
- **A grid that fits the space.** Columns and rows follow the real size of the dock or window.
- **Simpler filters.** The common building filters sit in a compact bar. Everything else is in a Filters drawer with named groups, and active filters show as chips you can remove.
- **Tags.** Tag many assets at once (pick them, or tag all results) and browse a saved-tags view.
- **More on hover.** Lot size, level, theme and pack in the hover card, plus sorting by lot size.
- **Escape** closes an open menu or drawer first, then the panel. Find It 2.0's own rule for when the panel takes the Escape key applies too.
- **Mod Button Manager.** If its top bar is open, the dock starts just below it.

## Where the code is

All of this fork's work is in [`local/`](../local):

- `local/ui`: the dock interface.
- `local/src`: small C# additions.
- `local/build.sh`: a Linux build that compiles against the game's own files.

The author's code under `FindIt/` is kept almost unchanged; a handful of files get small hooks. That way the fork can follow the author's releases. `local/update-check.sh` rebases these changes onto each new release, builds and checks the result, and only updates if everything still works.

## The original README

The author's README, with Find It's features and credits, is unchanged: [README.md](../README.md).

The original repository has no licence file. This fork exists for personal use.
