import { trigger, useValue } from "cs2/api";
import classNames from "classnames";
import * as B from "bindings";
import { clickOption, findSection } from "options";
import { DropdownTheme, GLYPH, ToolOptionsTheme } from "native";
import { screenKey } from "layout";
import { setUiState, useUiState } from "store";
import { Btn, ToolBtn } from "./controls";
import styles from "./dock.module.scss";

const item = (selected: boolean) => classNames(DropdownTheme.dropdownItem, styles.menuItem, selected && styles.menuItemOn);

export const SortMenu = (props: { onClose: () => void }) => {
  const options = useValue(B.OptionsList$);
  const sorting = findSection(options, B.Section.Sorting);
  const order = findSection(options, B.Section.SortOrder);

  return (
    <>
      <div className={styles.menuTitle}>Sort by</div>
      {sorting?.options.map((o) => (
        <Btn
          key={o.id}
          className={item(o.selected)}
          onSelect={() => {
            clickOption(B.Section.Sorting, o.id);
            props.onClose();
          }}
        >
          <img src={o.icon} className={styles.menuIcon} />
          <div>{o.name.replace(/^Sort by /i, "").replace(/^\w/, (c) => c.toUpperCase())}</div>
        </Btn>
      ))}
      {order && (
        <>
          <div className={styles.menuSep} />
          {order.options.map((o) => (
            <Btn key={o.id} className={item(o.selected)} onSelect={() => clickOption(B.Section.SortOrder, o.id)}>
              <img src={o.icon} className={styles.menuIcon} />
              <div>{o.name.replace(/ Order$/i, "")}</div>
            </Btn>
          ))}
        </>
      )}
    </>
  );
};

const VIEW_NAMES: Record<string, string> = {
  GridTextViewSmall: "Tiles with names",
  Image: "Large tiles",
  GridView: "Small tiles",
  ListViewDense: "List",
};

const DOCK_NAMES: Record<number, string> = { 1: "Left", 2: "Bottom", 3: "Right" };

export const ViewMenu = () => {
  const options = useValue(B.OptionsList$);
  const expanded = useValue(B.IsExpanded$);
  const views = findSection(options, B.Section.ViewStyle);
  const alignment = findSection(options, B.Section.Alignment);
  const width = findSection(options, B.Section.Width);
  const height = findSection(options, B.Section.Height);
  const ui = useUiState();
  const bottom = !ui.floating && (alignment?.options.find((o) => o.id === 2)?.selected ?? false);

  const resetWindow = () => {
    const rects = { ...ui.rects };
    delete rects[screenKey()];
    setUiState({ rects });
  };

  const stepper = (label: string, section: typeof width) =>
    section && (
      <div className={styles.menuStepper}>
        <div className={styles.menuStepperLabel}>{label}</div>
        <ToolBtn src={GLYPH.down} className={ToolOptionsTheme.startButton} tooltip="Smaller" onSelect={() => clickOption(section.id, section.options[0].id, -1)} />
        <div className={classNames(ToolOptionsTheme.numberField, styles.numberField)}>{section.options[0].value}</div>
        <ToolBtn src={GLYPH.up} className={ToolOptionsTheme.endButton} tooltip="Bigger" onSelect={() => clickOption(section.id, section.options[0].id, 1)} />
      </div>
    );

  const viewName = (icon: string) => Object.keys(VIEW_NAMES).find((k) => icon.includes(k));

  return (
    <>
      <div className={styles.menuTitle}>Tiles</div>
      {views?.options.map((o) => (
        <Btn key={o.id} className={item(o.selected)} onSelect={() => clickOption(B.Section.ViewStyle, o.id)}>
          <img src={o.icon} className={styles.menuIcon} />
          <div>{VIEW_NAMES[viewName(o.icon) ?? ""] ?? o.name}</div>
        </Btn>
      ))}
      <div className={styles.menuSep} />
      <div className={styles.menuTitle}>Dock</div>
      {alignment?.options.map((o) => (
        <Btn
          key={o.id}
          className={item(o.selected && !ui.floating)}
          onSelect={() => {
            setUiState({ floating: false });
            clickOption(B.Section.Alignment, o.id);
          }}
        >
          <img src={o.icon} className={styles.menuIcon} />
          <div>{DOCK_NAMES[o.id] ?? o.name}</div>
        </Btn>
      ))}
      <Btn className={item(ui.floating)} onSelect={() => setUiState({ floating: true })}>
        <img src="coui://uil/Standard/ArrowsMoveAll.svg" className={styles.menuIcon} />
        <div>Floating window</div>
      </Btn>
      <div className={styles.menuSep} />
      <div className={styles.menuTitle}>Size</div>
      {ui.floating ? (
        <>
          <div className={styles.menuHint}>Drag the window's edges or corners. Drag its title to a screen edge to dock it.</div>
          <Btn className={item(false)} onSelect={resetWindow}>
            <div>Reset window size and place</div>
          </Btn>
        </>
      ) : (
        <>
          {stepper("Width", width)}
          {stepper("Height", height)}
        </>
      )}
      {bottom && (
        <Btn className={item(expanded)} onSelect={() => trigger(B.G, "SetIsExpanded", !expanded)}>
          <div>{expanded ? "Expanded" : "Expand"}</div>
        </Btn>
      )}
    </>
  );
};
