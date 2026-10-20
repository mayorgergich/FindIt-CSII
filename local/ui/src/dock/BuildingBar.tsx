import { useValue } from "cs2/api";
import { ReactNode, useRef, useState } from "react";
import classNames from "classnames";
import * as B from "bindings";
import { MATCH_LABEL, MATCH_MODES, MatchMode, clickOption, findSection, fromFilter, lotLabel, setLevel, setLotSize } from "options";
import { DropdownTheme, GLYPH, ToolOptionsTheme, ToolSection } from "native";
import { Btn, Glyph, ToolBtn } from "./controls";
import { MenuKind } from "./Header";
import styles from "./dock.module.scss";

// One tool-options row: bold label on the left, controls on the right (the game's own layout).
const Row = (props: { title: string; children: ReactNode }) =>
  ToolSection ? (
    <ToolSection title={props.title}>{props.children}</ToolSection>
  ) : (
    <div className={ToolOptionsTheme.item}>
      <div className={ToolOptionsTheme.label}>{props.title}</div>
      <div className={ToolOptionsTheme.content}>{props.children}</div>
    </div>
  );

// A dropdown toggle in the in-game style (dark field, dim text, arrow).
export const DropToggle = (props: { label: string; active?: boolean; tooltip?: string; onSelect: () => void; anchor: React.RefObject<HTMLDivElement> }) => (
  <Btn ref={props.anchor} className={classNames(DropdownTheme.dropdownToggle, styles.dropToggle, props.active && styles.dropToggleSet)} tooltip={props.tooltip} onSelect={props.onSelect}>
    <div className={styles.dropLabel}>{props.label}</div>
    <Glyph src={GLYPH.down} className={classNames(DropdownTheme.indicator, styles.dropIndicator)} />
  </Btn>
);

type BarProps = {
  onMenu: (kind: MenuKind, anchor: HTMLElement | null) => void;
};

// Density, lot size, level and theme: the filters you use while browsing buildings.
export const BuildingBar = (props: BarProps) => {
  const options = useValue(B.OptionsList$);
  const category = useValue(B.CurrentCategory$);
  const zone = findSection(options, B.Section.ZoneType);
  const lot = findSection(options, B.Section.LotWidth);
  const level = findSection(options, B.Section.BuildingLevel);
  const theme = findSection(options, B.Section.Theme);
  const lotRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);
  const isBuildings = category === 100 || category === 200;

  if (!zone && !lot && !level) {
    return null;
  }

  const levelValue = fromFilter(level);

  return (
    <div className={styles.bar}>
      {zone && (
        <Row title="Density">
          {zone.options.map((o) => (
            <ToolBtn key={o.id} src={o.icon} tooltip={o.name} selected={o.selected} onSelect={() => clickOption(B.Section.ZoneType, o.id)} />
          ))}
        </Row>
      )}
      {lot && (
        <Row title="Lot size">
          <DropToggle anchor={lotRef} label={lotLabel(options)} active={lotLabel(options) !== "Any"} tooltip="Width × depth in cells" onSelect={() => props.onMenu("lot", lotRef.current)} />
        </Row>
      )}
      {level && (
        <Row title="Level">
          <ToolBtn
            src={GLYPH.down}
            tooltip="Lower"
            className={ToolOptionsTheme.startButton}
            disabled={levelValue.value <= 0}
            onSelect={() => setLevel(Math.max(0, levelValue.value - 1), levelValue.mode)}
          />
          <div className={classNames(ToolOptionsTheme.numberField, styles.numberField)}>{levelValue.value ? String(levelValue.value) : "Any"}</div>
          <ToolBtn
            src={GLYPH.up}
            tooltip="Higher"
            className={ToolOptionsTheme.endButton}
            disabled={levelValue.value >= 5}
            onSelect={() => setLevel(Math.min(5, levelValue.value + 1), levelValue.mode)}
          />
          <div className={styles.gapS} />
          <DropToggle anchor={modeRef} label={MATCH_LABEL[levelValue.mode]} tooltip="How the level is matched" onSelect={() => props.onMenu("levelMode", modeRef.current)} />
        </Row>
      )}
      {theme && isBuildings && (
        <Row title="Theme">
          {theme.options.map((o) => (
            <ToolBtn key={o.id} src={o.icon} tooltip={o.name} selected={o.selected} onSelect={() => clickOption(B.Section.Theme, o.id)} />
          ))}
        </Row>
      )}
    </div>
  );
};

// Popover: click a cell to filter by that lot. 3 wide × 2 deep is one click.
export const LotMenu = (props: { onClose: () => void }) => {
  const options = useValue(B.OptionsList$);
  const width = fromFilter(findSection(options, B.Section.LotWidth));
  const depth = fromFilter(findSection(options, B.Section.LotDepth));
  const [mode, setMode] = useState<MatchMode>(width.value || depth.value ? width.mode : "eq");
  const [hover, setHover] = useState<[number, number] | null>(null);

  const changeMode = (m: MatchMode) => {
    setMode(m);
    if (width.value || depth.value) setLotSize(width.value, depth.value, m);
  };

  const rows: JSX.Element[] = [];
  for (let d = 1; d <= 6; d++) {
    const cells: JSX.Element[] = [];
    for (let w = 1; w <= 6; w++) {
      const current = width.value === w && depth.value === d;
      const lit = hover !== null && w <= hover[0] && d <= hover[1];
      cells.push(
        <div
          key={w}
          className={classNames(styles.lotCell, current ? styles.lotCellCurrent : lit && styles.lotCellLit)}
          onMouseEnter={() => setHover([w, d])}
          onClick={() => {
            setLotSize(w, d, mode);
            props.onClose();
          }}
        >
          {current || (hover && hover[0] === w && hover[1] === d) ? `${w}×${d}` : ""}
        </div>,
      );
    }
    rows.push(
      <div key={d} className={styles.lotRow}>
        {cells}
      </div>,
    );
  }

  return (
    <>
      <div className={styles.menuTitle}>Lot size</div>
      <ModeRow mode={mode} onChange={changeMode} />
      <div className={styles.lotAxis}>
        <div>Width across, depth down</div>
        <div>{hover ? `${hover[0]} × ${hover[1]}` : lotLabel(options)}</div>
      </div>
      <div className={styles.lotGrid} onMouseLeave={() => setHover(null)}>
        {rows}
      </div>
      <Btn
        className={classNames(DropdownTheme.dropdownItem, styles.menuItem)}
        onSelect={() => {
          setLotSize(0, 0, "eq");
          props.onClose();
        }}
      >
        Any size
      </Btn>
      <div className={styles.hint}>Sizes up to 10 are in Filters.</div>
    </>
  );
};

const ModeRow = (props: { mode: MatchMode; onChange: (mode: MatchMode) => void }) => (
  <div className={styles.modeRow}>
    {MATCH_MODES.map((m) => (
      <Btn key={m} className={classNames(styles.modeBtn, props.mode === m && styles.modeBtnOn)} selected={props.mode === m} onSelect={() => props.onChange(m)}>
        {MATCH_LABEL[m]}
      </Btn>
    ))}
  </div>
);

export const LevelModeMenu = (props: { onClose: () => void }) => {
  const options = useValue(B.OptionsList$);
  const level = fromFilter(findSection(options, B.Section.BuildingLevel));

  return (
    <>
      <div className={styles.menuTitle}>Match level</div>
      {MATCH_MODES.map((m) => (
        <Btn
          key={m}
          className={classNames(DropdownTheme.dropdownItem, styles.menuItem, level.mode === m && styles.menuItemOn)}
          onSelect={() => {
            if (level.value) setLevel(level.value, m);
            props.onClose();
          }}
        >
          {MATCH_LABEL[m]}
        </Btn>
      ))}
    </>
  );
};
