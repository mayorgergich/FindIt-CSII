// Toolbar buttons for the picker and Find It. Same as the author's ToolbarIcon.tsx, except the
// "selected" class: `ShowFindItPanel || IsWindowLocked && style.selected` gave the button a
// class named "true" whenever the panel was open (operator precedence).
import { trigger, useValue } from "cs2/api";
import { Theme } from "cs2/bindings";
import { getModule, ModuleRegistryExtend } from "cs2/modding";
import { Button } from "cs2/ui";
import { FOCUS_DISABLED } from "cs2/input";
import classNames from "classnames";
import * as B from "bindings";
import { bindValue } from "cs2/api";
import style from "upstream/mods/ToolbarIcon/ToolbarIcon.module.scss";
import PickerIconSrc from "images/PickerPicker.svg";
import FindItIconSrc from "images/Magnifier.svg";

const PickerActive$ = bindValue<boolean>(B.G, "PickerActive", false);
const ToolBarButtonTheme: Theme | any = getModule("game-ui/game/components/toolbar/components/feature-button/toolbar-feature-button-new.module.scss", "classes");
const ToolBarTheme: Theme | any = getModule("game-ui/game/components/toolbar/toolbar.module.scss", "classes");

export const ToolbarIcons: ModuleRegistryExtend = (Component) => {
  return (props) => {
    const { children, ...otherProps } = props || {};
    const locked = useValue(B.IsWindowLocked$);
    const pickerActive = useValue(PickerActive$);
    const shown = useValue(B.ShowFindItPanel$);
    const open = shown || locked;

    return (
      <>
        <Button
          src={PickerIconSrc}
          className={classNames(ToolBarButtonTheme.button, style.ToolbarIcon, pickerActive && style.selected)}
          variant="icon"
          focusKey={FOCUS_DISABLED}
          selected={pickerActive}
          onSelect={() => trigger(B.G, "PickerIconToggled")}
        />
        <div className={ToolBarTheme.divider}></div>
        <Button
          src={FindItIconSrc}
          className={classNames(ToolBarButtonTheme.button, style.ToolbarIcon, open && style.selected)}
          variant="icon"
          focusKey={FOCUS_DISABLED}
          selected={open}
          onSelect={() => trigger(B.G, "FindItIconToggled")}
        />
        <div className={ToolBarTheme.divider}></div>
        <Component {...otherProps}>{children}</Component>
      </>
    );
  };
};
