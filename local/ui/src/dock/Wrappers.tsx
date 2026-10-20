import { useValue } from "cs2/api";
import { ModuleRegistryExtend } from "cs2/modding";
import * as B from "bindings";
import { DOCK_SIDE, dockWidth } from "layout";
import { useUiState } from "store";
import styles from "upstream/mods/WrapToolOptionsPanel/WrapToolOptionsPanel.module.scss";

const RIGHT_DOCK_SIDE = 58; // matches .area.right in dock.module.scss

// Keeps tool options (Line Tool, Tree Controller, Move It...) beside the dock instead of under it.
export const DockToolOptionsWrapper: ModuleRegistryExtend = (Component) => {
  return (props) => {
    const { children, ...otherProps } = props || {};
    const shown = useValue(B.ShowFindItPanel$);
    const locked = useValue(B.IsWindowLocked$);
    const alignment = useValue(B.AlignmentStyle$);
    const picker = useValue(B.IsPrefabSelection$);
    const rightColumn = useValue(B.RightColumnSize$);
    const ui = useUiState();

    // Folded to its title bar, the dock leaves the bottom corner free again. A floating window
    // is placed by the player, so tool options stay where the game puts them.
    if (!(shown || locked) || picker || ui.floating || alignment === "Center" || ui.collapsed) {
      return <Component {...otherProps}>{children}</Component>;
    }

    const offset = (alignment === "Right" ? RIGHT_DOCK_SIDE : DOCK_SIDE) + dockWidth(rightColumn) + 12;

    return (
      <div
        className={styles.wrapper}
        style={alignment === "Right" ? { alignItems: "flex-end", paddingRight: offset + "rem" } : { alignItems: "flex-start", paddingLeft: offset + "rem" }}
      >
        <Component {...otherProps}>{children}</Component>
      </div>
    );
  };
};
