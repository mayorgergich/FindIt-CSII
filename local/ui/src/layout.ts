// Sizes are in rem. The game sizes rem from the screen: at 16:9 the screen is 1920 x 1080rem.
// On other shapes don't assume which side it scales by; pxPerRem() measures it.

export const DOCK_TOP = 64; // clears the top-left HUD row (Info and similar buttons)
export const DOCK_SIDE = 12;
export const RAIL_WIDTH = 60;
export const TILE_GAP = 3; // keep in step with local/src/GridUtil.Local.cs
export const NAME_HEIGHT = 18; // name line under "tiles with names"
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

  return { width, height: viewStyle === "GridWithText" ? width + NAME_HEIGHT : width };
}

let cachedPxPerRem = 0;
let cachedFor = "";

// Screen pixels per rem, from the root font size. Gameface's getComputedStyle returns that size
// as written in the game's index.css ("0.0520833vw" or "0.0925926vh"), not in px, so the unit
// is converted here. A probe element reads 0 (no synchronous layout), so it isn't used.
export function pxPerRem(): number {
  const key = `${window.innerWidth}x${window.innerHeight}`;

  if (cachedPxPerRem > 0 && cachedFor === key) {
    return cachedPxPerRem;
  }

  let value = 0;

  try {
    const size = window.getComputedStyle(document.documentElement).fontSize.trim();
    const number = parseFloat(size);

    if (size.endsWith("vw")) value = (number * window.innerWidth) / 100;
    else if (size.endsWith("vh")) value = (number * window.innerHeight) / 100;
    else if (size.endsWith("px")) value = number;
  } catch {
    value = 0;
  }

  // Fallback: the game's own rule (16:9 and wider scale by height, taller screens by width).
  if (!(value > 0) || value > 10) {
    value = window.innerHeight >= window.innerWidth * 0.5625 ? window.innerWidth / 1920 : window.innerHeight / 1080;
  }

  cachedPxPerRem = value;
  cachedFor = key;

  return cachedPxPerRem;
}

export const pxToRem = (px: number) => px / pxPerRem();
