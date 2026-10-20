// Find It (local build): the author's UI registrations, with the panel replaced by the dock.
import { ModRegistrar } from "cs2/modding";
import { VanillaComponentResolver } from "upstream/mods/VanillaComponentResolver/VanillaComponentResolver";
import { RemoveVanillaAssetMenuComponent } from "upstream/mods/RemoveVanillaAssetMenu/RemoveVanillaAssetMenu";
import { PickerComponent } from "upstream/mods/PickerComponent/PickerComponent";
import { ToolOptionsVisibility } from "upstream/mods/PickerComponent/ToolOptionsVisibility";
import { CreatorPropertiesComponent } from "upstream/mods/CreatorProperties/CreatorProperties";
import { BottomBarExtension } from "upstream/mods/CreatorProperties/CreatorPropertiesButton";
import { Dock } from "dock/Dock";
import { DockToolOptionsWrapper } from "dock/Wrappers";
import { ToolbarIcons } from "dock/ToolbarIcons";

const register: ModRegistrar = (moduleRegistry) => {
  VanillaComponentResolver.setRegistry(moduleRegistry);

  // Find It replaces the vanilla asset menu while its panel is open.
  moduleRegistry.extend("game-ui/game/components/asset-menu/asset-menu.tsx", "AssetMenu", RemoveVanillaAssetMenuComponent);
  moduleRegistry.extend("game-ui/game/components/tool-options/tool-options-panel.tsx", "ToolOptionsPanel", DockToolOptionsWrapper);

  // Find It and picker buttons in the top toolbar.
  moduleRegistry.extend("game-ui/game/components/toolbar/top/toggles.tsx", "PhotoModeToggle", ToolbarIcons);

  // Picker tool options.
  moduleRegistry.extend("game-ui/game/components/tool-options/mouse-tool-options/mouse-tool-options.tsx", "MouseToolOptions", PickerComponent);
  moduleRegistry.extend("game-ui/game/components/tool-options/tool-options-panel.tsx", "useToolOptionsVisible", ToolOptionsVisibility);

  moduleRegistry.append("Game", Dock);
  moduleRegistry.append("Editor", Dock);
  moduleRegistry.append("Editor", CreatorPropertiesComponent);
  moduleRegistry.extend("game-ui/editor/components/bottom-bar/bottom-bar.tsx", "BottomBar", BottomBarExtension);
};

export default register;
