// The game's own UI pieces, looked up from its module registry so the dock is built from the
// same components and class names as the vanilla asset menu, tool options and panels.
// Every lookup tolerates a missing module (a game update could move one): classes fall back to
// {} and components to undefined, and callers then use plain markup.
import { getModule } from "cs2/modding";

const classes = (path: string): Record<string, string> => {
  try {
    return (getModule(path, "classes") as Record<string, string>) ?? {};
  } catch {
    return {};
  }
};

const component = (path: string, name: string): any => {
  try {
    return getModule(path, name);
  } catch {
    return undefined;
  }
};

// Panels (title bar, uppercase accent title, close/toggle buttons).
export const PanelTheme = classes("game-ui/common/panel/panel.module.scss");
export const PanelDefaultTheme = classes("game-ui/common/panel/themes/default.module.scss");

// Vanilla asset menu: category tabs, asset tiles, asset detail panel.
export const TabBarTheme = classes("game-ui/game/components/asset-menu/asset-category-tab-bar/asset-category-tab-bar.module.scss");
export const TabItemTheme = classes("game-ui/game/components/asset-menu/asset-category-tab-bar/category-item.module.scss");
export const ItemGridTheme = classes("game-ui/game/components/item-grid/item-grid.module.scss");
export const DetailTheme = classes("game-ui/game/components/asset-menu/asset-detail-panel/asset-detail-panel.module.scss");
export const PropertyTheme = classes("game-ui/game/components/asset-menu/asset-detail-panel/property-field.module.scss");

// Tool options (Line Tool, Tree Controller...): rows, dark square buttons, steppers.
export const ToolButtonTheme = classes("game-ui/game/components/tool-options/tool-button/tool-button.module.scss");
export const ToolOptionsTheme = classes("game-ui/game/components/tool-options/mouse-tool-options/mouse-tool-options.module.scss");
export const ToolButton = component("game-ui/game/components/tool-options/tool-button/tool-button.tsx", "ToolButton");
export const ToolSection = component("game-ui/game/components/tool-options/mouse-tool-options/mouse-tool-options.tsx", "Section");

// In-game dropdowns, text fields, toggles, foldouts, icons.
export const DropdownTheme = classes("game-ui/game/themes/game-dropdown.module.scss");
export const InputTheme = classes("game-ui/editor/widgets/item/editor-item.module.scss");
export const FoldoutTheme = classes("game-ui/common/foldout/themes/info-section-foldout.module.scss");
export const TextInput = component("game-ui/common/input/text/text-input.tsx", "TextInput");
export const Checkbox = component("game-ui/common/input/toggle/checkbox/checkbox.tsx", "Checkbox");
export const RadioToggle = component("game-ui/common/input/toggle/radio-toggle/radio-toggle.tsx", "RadioToggle");
export const IconButton = component("game-ui/common/input/button/icon-button.tsx", "IconButton");
export const TintedIcon = component("game-ui/common/image/tinted-icon.tsx", "TintedIcon");

// Glyphs the game itself uses for these controls.
export const GLYPH = {
  close: "Media/Glyphs/Close.svg",
  expand: "Media/Glyphs/ThickStrokeArrowDown.svg",
  collapse: "Media/Glyphs/ThickStrokeArrowUp.svg",
  down: "Media/Glyphs/ThickStrokeArrowDown.svg",
  up: "Media/Glyphs/ThickStrokeArrowUp.svg",
};
