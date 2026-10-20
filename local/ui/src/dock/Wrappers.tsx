import { useValue } from "cs2/api";
import { ModuleRegistryExtend } from "cs2/modding";
import * as B from "bindings";
import { DOCK_SIDE, RAIL_WIDTH, dockWidth } from "layout";
import { useUiState } from "store";
import styles from "upstream/mods/WrapToolOptionsPanel/WrapToolOptionsPanel.module.scss";

// The vanilla right-side menu only has to make way when the dock is on the right.
export const DockRightMenuWrapper: ModuleRegistryExtend = (Component) => {
  return (props) => {
    const { children, ...otherProps } = props || {};
    const shown = useValue(B.ShowFindItPanel$);
    const locked = useValue(B.IsWindowLocked$);
    const alignment = useValue(B.AlignmentStyle$);

    if ((shown || locked) && alignment === "Right") {
      return <></>;
    }

    return <Component {...otherProps}>{children}</Component>;
  };
};

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

    if (!(shown || locked) || picker || alignment === "Center") {
      return <Component {...otherProps}>{children}</Component>;
    }

    const offset = DOCK_SIDE + (ui.collapsed ? RAIL_WIDTH : dockWidth(rightColumn)) + 24;

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
