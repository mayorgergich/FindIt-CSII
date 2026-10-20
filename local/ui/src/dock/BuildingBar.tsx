import { useValue } from "cs2/api";
import { useRef, useState } from "react";
import classNames from "classnames";
import * as B from "bindings";
import {
  DENSITY_SHORT,
  MATCH_LABEL,
  MATCH_MODES,
  MatchMode,
  clickOption,
  findSection,
  fromFilter,
  levelLabel,
  lotLabel,
  setLevel,
  setLotSize,
} from "options";
import { Btn, Caret } from "./controls";
import { MenuKind } from "./Header";
import styles from "./dock.module.scss";

type BarProps = {
  menu: MenuKind | null;
  onMenu: (kind: MenuKind, anchor: HTMLElement | null) => void;
};

// Density, lot size, level and theme, always visible while browsing buildings.
export const BuildingBar = (props: BarProps) => {
  const options = useValue(B.OptionsList$);
  const category = useValue(B.CurrentCategory$);
  const zone = findSection(options, B.Section.ZoneType);
  const lot = findSection(options, B.Section.LotWidth);
  const level = findSection(options, B.Section.BuildingLevel);
  const theme = findSection(options, B.Section.Theme);
  const lotRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const isBuildings = category === 100 || category === 200;

  if (!zone && !lot && !level) {
    return null;
  }

  const themeSelected = theme?.options.find((o) => o.selected);
  const themeText = !theme || theme.options[0]?.selected ? "Any" : themeSelected?.name ?? "Any";

  return (
    <div className={styles.bar}>
      {zone && (
        <div className={styles.barRow}>
          <div className={styles.barLabel}>Density</div>
          <div className={styles.seg}>
            {zone.options.map((o) => (
              <Btn
                key={o.id}
                className={classNames(styles.segBtn, o.selected && styles.on)}
                tooltip={o.name}
                onSelect={() => clickOption(B.Section.ZoneType, o.id)}
              >
                {DENSITY_SHORT[o.id] ?? o.name}
              </Btn>
            ))}
          </div>
        </div>
      )}
      <div className={styles.barRow}>
        {lot && (
          <Btn
            ref={lotRef}
            className={classNames(styles.pick, lotLabel(options) !== "Any" && styles.set)}
            tooltip="Lot size, width × depth in cells"
            onSelect={() => props.onMenu("lot", lotRef.current)}
          >
            <div className={styles.pickLabel}>Lot</div>
            <div className={styles.pickValue}>{lotLabel(options)}</div>
            <Caret />
          </Btn>
        )}
        {level && (
          <Btn
            ref={levelRef}
            className={classNames(styles.pick, levelLabel(options) !== "Any" && styles.set)}
            tooltip="Building level"
            onSelect={() => props.onMenu("level", levelRef.current)}
          >
            <div className={styles.pickLabel}>Level</div>
            <div className={styles.pickValue}>{levelLabel(options)}</div>
            <Caret />
          </Btn>
        )}
        {theme && isBuildings && (
          <Btn
            ref={themeRef}
            className={classNames(styles.pick, themeText !== "Any" && styles.set)}
            tooltip="European or North American style"
            onSelect={() => props.onMenu("theme", themeRef.current)}
          >
            <div className={styles.pickLabel}>Theme</div>
            <div className={styles.pickValue}>{themeText}</div>
            <Caret />
          </Btn>
        )}
      </div>
    </div>
  );
};

const ModeSwitch = (props: { mode: MatchMode; onChange: (mode: MatchMode) => void }) => (
  <div className={styles.seg}>
    {MATCH_MODES.map((m) => (
      <Btn key={m} className={classNames(styles.segBtn, props.mode === m && styles.on)} onSelect={() => props.onChange(m)}>
        {MATCH_LABEL[m]}
      </Btn>
    ))}
  </div>
);

// Click a cell to filter by that lot: 3 wide × 2 deep is one click.
export const LotMenu = (props: { onClose: () => void }) => {
  const options = useValue(B.OptionsList$);
  const width = fromFilter(findSection(options, B.Section.LotWidth));
  const depth = fromFilter(findSection(options, B.Section.LotDepth));
  const [mode, setMode] = useState<MatchMode>(width.value || depth.value ? width.mode : "eq");
  const [hover, setHover] = useState<[number, number] | null>(null);

  const changeMode = (m: MatchMode) => {
    setMode(m);
    if (width.value || depth.value) {
      setLotSize(width.value, depth.value, m);
    }
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
          className={classNames(styles.lotCell, current ? styles.cur : lit && styles.hl)}
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
      <div className={styles.popTitle}>Lot size, width × depth</div>
      <ModeSwitch mode={mode} onChange={changeMode} />
      <div className={styles.lotAxis} style={{ marginTop: "8rem" }}>
        <div>Width across</div>
        <div>{hover ? `${hover[0]} × ${hover[1]}` : lotLabel(options)}</div>
      </div>
      <div className={styles.lotGrid} onMouseLeave={() => setHover(null)}>
        {rows}
      </div>
      <div className={styles.lotAxis}>
        <div>Depth down</div>
      </div>
      <div className={styles.popSep} />
      <Btn
        className={styles.popOpt}
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

export const LevelMenu = () => {
  const options = useValue(B.OptionsList$);
  const level = fromFilter(findSection(options, B.Section.BuildingLevel));
  const [mode, setMode] = useState<MatchMode>(level.mode);

  return (
    <>
      <div className={styles.popTitle}>Building level</div>
      <div className={styles.seg} style={{ marginBottom: "8rem" }}>
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <Btn key={v} className={classNames(styles.segBtn, level.value === v && styles.on)} onSelect={() => setLevel(v, mode)}>
            {v === 0 ? "Any" : String(v)}
          </Btn>
        ))}
      </div>
      <ModeSwitch
        mode={mode}
        onChange={(m) => {
          setMode(m);
          if (level.value) setLevel(level.value, m);
        }}
      />
    </>
  );
};

export const ThemeMenu = (props: { onClose: () => void }) => {
  const options = useValue(B.OptionsList$);
  const theme = findSection(options, B.Section.Theme);

  return (
    <>
      <div className={styles.popTitle}>Theme</div>
      {theme?.options.map((o) => (
        <Btn
          key={o.id}
          className={classNames(styles.popOpt, o.selected && styles.on)}
          onSelect={() => {
            clickOption(B.Section.Theme, o.id);
            props.onClose();
          }}
        >
          <img src={o.icon} className={styles.popOptIcon} />
          <div>{o.name}</div>
        </Btn>
      ))}
    </>
  );
};
