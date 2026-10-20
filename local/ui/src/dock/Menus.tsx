import { trigger, useValue } from "cs2/api";
import classNames from "classnames";
import * as B from "bindings";
import { clickOption, findSection } from "options";
import { Btn } from "./controls";
import styles from "./dock.module.scss";

export const SortMenu = (props: { onClose: () => void }) => {
  const options = useValue(B.OptionsList$);
  const sorting = findSection(options, B.Section.Sorting);
  const order = findSection(options, B.Section.SortOrder);

  return (
    <>
      <div className={styles.popTitle}>Sort by</div>
      {sorting?.options.map((o) => (
        <Btn
          key={o.id}
          className={classNames(styles.popOpt, o.selected && styles.on)}
          onSelect={() => {
            clickOption(B.Section.Sorting, o.id);
            props.onClose();
          }}
        >
          <img src={o.icon} className={styles.popOptIcon} />
          <div>{o.name.replace(/^Sort by /i, "")}</div>
        </Btn>
      ))}
      {order && (
        <>
          <div className={styles.popSep} />
          <div className={styles.seg}>
            {order.options.map((o) => (
              <Btn key={o.id} className={classNames(styles.segBtn, o.selected && styles.on)} onSelect={() => clickOption(B.Section.SortOrder, o.id)}>
                {o.name.replace(/ Order$/i, "")}
              </Btn>
            ))}
          </div>
        </>
      )}
    </>
  );
};

const VIEW_NAMES: Record<string, string> = {
  GridWithText: "Large tiles with names",
  GridNoText: "Images, names on hover",
  GridSmall: "Small images",
  ListSimple: "List",
};

const DOCK_NAMES: Record<string, string> = { Left: "Left", Center: "Bottom", Right: "Right" };

export const ViewMenu = () => {
  const options = useValue(B.OptionsList$);
  const viewStyle = useValue(B.ViewStyle$);
  const expanded = useValue(B.IsExpanded$);
  const views = findSection(options, B.Section.ViewStyle);
  const alignment = findSection(options, B.Section.Alignment);
  const width = findSection(options, B.Section.Width);
  const height = findSection(options, B.Section.Height);
  const center = alignment?.options.find((o) => o.id === 2)?.selected ?? false;

  const stepper = (label: string, section: typeof width) =>
    section && (
      <div className={styles.stepper}>
        <div className={styles.stepperName}>{label}</div>
        <Btn className={styles.stepBtn} onSelect={() => clickOption(section.id, section.options[0].id, -1)}>
          -
        </Btn>
        <div className={styles.stepValue}>{section.options[0].value}</div>
        <Btn className={styles.stepBtn} onSelect={() => clickOption(section.id, section.options[0].id, 1)}>
          +
        </Btn>
      </div>
    );

  return (
    <>
      <div className={styles.popTitle}>Tiles</div>
      {views?.options.map((o) => (
        <Btn key={o.id} className={classNames(styles.popOpt, o.selected && styles.on)} onSelect={() => clickOption(B.Section.ViewStyle, o.id)}>
          <img src={o.icon} className={styles.popOptIcon} />
          <div>{VIEW_NAMES[viewNameFromIcon(o.icon)] ?? o.name}</div>
        </Btn>
      ))}
      <div className={styles.popSep} />
      <div className={styles.popTitle}>Dock</div>
      <div className={styles.seg}>
        {alignment?.options.map((o) => (
          <Btn key={o.id} className={classNames(styles.segBtn, o.selected && styles.on)} onSelect={() => clickOption(B.Section.Alignment, o.id)}>
            {DOCK_NAMES[["Left", "Center", "Right"][o.id - 1]] ?? o.name}
          </Btn>
        ))}
      </div>
      <div className={styles.popSep} />
      <div className={styles.popTitle}>Size</div>
      {stepper("Width", width)}
      {stepper("Height", height)}
      {center && (
        <Btn className={classNames(styles.popOpt, expanded && styles.on)} onSelect={() => trigger(B.G, "SetIsExpanded", !expanded)}>
          <div>{expanded ? "Expanded (click to shrink)" : "Expand"}</div>
        </Btn>
      )}
      <div className={styles.hint}>Current tiles: {VIEW_NAMES[viewStyle] ?? viewStyle}</div>
    </>
  );
};

function viewNameFromIcon(icon: string): string {
  if (icon.includes("GridTextViewSmall")) return "GridWithText";
  if (icon.includes("Image")) return "GridNoText";
  if (icon.includes("GridView")) return "GridSmall";
  if (icon.includes("ListView")) return "ListSimple";
  return "";
}
