// Sizes are in rem. The game sizes rem from the screen: at 16:9 the screen is 1920 x 1080rem.
// On other shapes don't assume which side it scales by; pxPerRem() measures it.

// Below Mod Button Manager's two-row top bar (rows at y 10-50 and 56-96, 99 for a 46-unit
// button). MBM moves the game's info-view menu and selected-object panel to top 108 while its bar
// shows two rows, so the dock lines up with them. Keep .area's top in dock.module.scss in step.
export const DOCK_TOP = 108;
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

// ---------- floating window ----------

export type Rect = { x: number; y: number; w: number; h: number };

export const FLOAT_MIN_WIDTH = 360; // toolbar row and one column of tiles
export const FLOAT_MIN_HEIGHT = 280;
export const FLOAT_DEFAULT_HEIGHT = 720;
export const TITLE_HEIGHT = 50; // the native panel header
export const SNAP_ZONE = 24; // pointer this close to the left/right screen edge docks the window
export const UNDOCK_DISTANCE = 12; // how far a docked title bar is dragged before it comes loose
export const CLICK_SLOP = 3; // less movement than this is a click (folds the window)
export const CARD_WIDTH = 330; // hover card, keep in step with .card in dock.module.scss
export const MENU_WIDTH = 240; // dropdown menus, keep in step with .menu in dock.module.scss

// The game's toolbar scale (0.8 to 1.3), read the way Parking Lot Tool does.
function toolbarScale(): number {
  try {
    const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--toolbarScale"));
    return value > 0 && value < 10 ? value : 1;
  } catch {
    return 1;
  }
}

// Screen size in rem and the band kept free for the toolbar (same as .area's bottom).
export function screenRem() {
  const legacy = !!document.querySelector(".legacy-interface");
  return {
    w: pxToRem(window.innerWidth),
    h: pxToRem(window.innerHeight),
    bottom: legacy ? 122 : 2 * 50 * toolbarScale() + 6,
  };
}

// Saved windows are kept per screen shape: the monitor is 1920x1080 rem, the iPad 1920x1440.
export const screenKey = () => {
  const s = screenRem();
  return `${Math.round(s.w)}x${Math.round(s.h)}`;
};

// Keeps a floating window on screen, above the toolbar, and at least its minimum size.
export function clampRect(r: Rect, collapsed: boolean): Rect {
  const s = screenRem();
  const maxW = Math.max(FLOAT_MIN_WIDTH, s.w);
  const maxH = Math.max(FLOAT_MIN_HEIGHT, s.h - s.bottom);
  const w = clamp(r.w, FLOAT_MIN_WIDTH, maxW);
  const h = clamp(r.h, FLOAT_MIN_HEIGHT, maxH);
  const x = clamp(r.x, 0, s.w - w);
  const y = clamp(r.y, 0, Math.max(0, s.h - s.bottom - (collapsed ? TITLE_HEIGHT : h)));
  return { x, y, w, h };
}

export function defaultFloatRect(width: number): Rect {
  const s = screenRem();
  return clampRect({ x: DOCK_SIDE, y: DOCK_TOP, w: width, h: Math.min(FLOAT_DEFAULT_HEIGHT, s.h - s.bottom - DOCK_TOP) }, false);
}

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
