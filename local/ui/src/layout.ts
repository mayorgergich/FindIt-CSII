// Sizes are in rem: the game sets 1rem = 1/1080 of the screen height, so the screen is always
// 1080rem tall and (16:9) 1920rem or (4:3) 1440rem wide.

export const DOCK_TOP = 64; // clears the top-left HUD row (Info and similar buttons)
export const DOCK_SIDE = 12;
export const RAIL_WIDTH = 60;
export const TILE_GAP = 6; // keep in step with local/src/GridUtil.Local.cs
export const SCROLLBAR_WIDTH = 14;
export const GRID_PADDING = 8;

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// The dock reuses the side-alignment size settings: Width/Height steppers move them in 5% steps.
export const dockWidth = (rightColumnSize: number) => clamp(330 + rightColumnSize * 3, 360, 640);
export const dockHeightPercent = (rightRowSize: number) => clamp(rightRowSize + 20, 40, 100);

// Bottom strip (Center alignment) keeps the original width formula.
export const stripWidth = (columnSize: number) => clamp(325 + columnSize * 8.5, 520, 1700);
export const stripGridHeight = (rowSize: number) => clamp(120 + rowSize * 3, 120, 700);

export const PICKER_WIDTH = 820;
export const PICKER_GRID_HEIGHT = 440;

// Tile size from the measured grid width and the column count C# derived from it.
export function tileSize(viewStyle: string, gridWidth: number, columns: number) {
  const cols = Math.max(1, columns || 1);

  if (viewStyle === "ListSimple") {
    return { width: gridWidth, height: 28 };
  }

  const width = Math.max(20, (gridWidth - TILE_GAP * (cols - 1)) / cols);

  return { width, height: viewStyle === "GridWithText" ? width + 22 : width };
}

export const pxToRem = (px: number) => (px * 1080) / window.innerHeight;
