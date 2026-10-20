import { trigger, useValue } from "cs2/api";
import { game, tool } from "cs2/bindings";
import { InputActionConsumer } from "cs2/input";
import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import * as B from "bindings";
import { LocalPrefabEntry } from "types";
import { activeChips } from "options";
import {
  DOCK_SIDE,
  PICKER_GRID_HEIGHT,
  PICKER_WIDTH,
  RAIL_WIDTH,
  dockHeightPercent,
  dockWidth,
  pxToRem,
  stripGridHeight,
  stripWidth,
} from "layout";
import { setUiState, useUiState } from "store";
import { Header, MenuKind } from "./Header";
import { FAVORITE_CATEGORY, Rail, selectCategory } from "./Rail";
import { ActiveChips, SubChips } from "./Chips";
import { BuildingBar, LevelMenu, LotMenu, ThemeMenu } from "./BuildingBar";
import { SortMenu, ViewMenu } from "./Menus";
import { Grid, HoverCard } from "./Grid";
import { FilterDrawer } from "./FilterDrawer";
import { BulkTagDrawer, TagDrawer } from "./TagDrawer";
import { Btn, Chevron } from "./controls";
import styles from "./dock.module.scss";

type Menu = { kind: MenuKind; left: number; top: number };
type Hover = { entry: LocalPrefabEntry; top: number };

export const Dock = () => {
  const shown = useValue(B.ShowFindItPanel$);
  const locked = useValue(B.IsWindowLocked$);
  const picker = useValue(B.IsPrefabSelection$);
  const alignment = useValue(B.AlignmentStyle$);
  const expanded = useValue(B.IsExpanded$);
  const rightRow = useValue(B.RightRowSize$);
  const rightColumn = useValue(B.RightColumnSize$);
  const rowSize = useValue(B.RowSize$);
  const columnSize = useValue(B.ColumnSize$);
  const expandedRow = useValue(B.ExpandedRowSize$);
  const expandedColumn = useValue(B.ExpandedColumnSize$);
  const tagEditorId = useValue(B.TagEditorPrefabId$);
  const category = useValue(B.CurrentCategory$);
  const search = useValue(B.CurrentSearch$);
  const options = useValue(B.OptionsList$);
  const official = useValue(B.OfficialUiEnabled$);
  const title = useValue(B.PrefabSelectionTitle$);
  const activeTool = useValue(tool.activeTool$);
  const activePanel = useValue(game.activeGamePanel$);
  const ui = useUiState();

  const [drawer, setDrawer] = useState<null | "filters" | "bulk">(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [tagSelection, setTagSelection] = useState<number[]>([]);
  const [bulkAll, setBulkAll] = useState(false);
  const [savedTag, setSavedTag] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const open = shown || locked;

  // The C# tag editor and our drawers share the same slot.
  useEffect(() => {
    if (tagEditorId !== 0) {
      setDrawer(null);
      setMenu(null);
    }
  }, [tagEditorId]);

  // Leaving a #tag search by typing something else leaves the Saved view.
  useEffect(() => {
    if (savedTag && search.trim().toLowerCase() !== "#" + savedTag.toLowerCase()) {
      setSavedTag(null);
    }
  }, [search]);

  useEffect(() => {
    if (!open) {
      setMenu(null);
      setDrawer(null);
      setHover(null);
      setSelectMode(false);
      setTagSelection([]);
    }
  }, [open]);

  if (activePanel?.__Type == game.GamePanelType.PhotoMode || !open) {
    return null;
  }

  const mode: "picker" | "strip" | "left" | "right" = picker ? "picker" : alignment === "Center" ? "strip" : alignment === "Right" ? "right" : "left";
  const collapsed = ui.collapsed && (mode === "left" || mode === "right");
  const savedView = savedTag !== null || category === FAVORITE_CATEGORY;
  const filterCount = activeChips(options).length;

  // ---------- actions ----------

  const openMenu = (kind: MenuKind, anchor: HTMLElement | null) => {
    if (menu?.kind === kind || !anchor || !dockRef.current) {
      setMenu(null);
      return;
    }
    const dockRect = dockRef.current.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    setMenu({ kind, left: pxToRem(rect.left - dockRect.left), top: pxToRem(rect.bottom - dockRect.top) + 4 });
  };

  const closeTagEditor = () => tagEditorId !== 0 && trigger(B.G, "CloseTagEditor");

  const toggleFilters = () => {
    closeTagEditor();
    setMenu(null);
    setDrawer(drawer === "filters" ? null : "filters");
  };

  const onCategory = (id: number) => {
    setUiState({ collapsed: false });
    if (savedTag) {
      setSavedTag(null);
      trigger(B.G, "SearchChanged", "");
    }
    selectCategory(id);
  };

  const onSaved = () => {
    setUiState({ collapsed: false });
    if (savedTag) {
      setSavedTag(null);
      trigger(B.G, "SearchChanged", "");
    }
    selectCategory(FAVORITE_CATEGORY);
  };

  const onTag = (tag: string) => {
    setSavedTag(tag);
    selectCategory(-1);
    trigger(B.G, "SearchChanged", "#" + tag);
  };

  const toggleSelect = () => {
    closeTagEditor();
    setDrawer(null);
    setTagSelection([]);
    setSelectMode(!selectMode);
  };

  const toggleTagSelection = (entry: LocalPrefabEntry) =>
    setTagSelection((list) => (list.includes(entry.id) ? list.filter((x) => x !== entry.id) : list.concat(entry.id)));

  const onHover = (entry: LocalPrefabEntry | null, element: HTMLElement | null) => {
    if (!entry || !element || !areaRef.current) {
      setHover(null);
      return;
    }
    const areaRect = areaRef.current.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const areaHeight = pxToRem(areaRect.height);
    setHover({ entry, top: Math.max(0, Math.min(pxToRem(rect.top - areaRect.top) - 10, areaHeight - 340)) });
  };

  // Escape: close the innermost thing. While a placement tool is active the game cancels the
  // tool first (and Find It closes with it unless it's kept open).
  const onBack = () => {
    if (menu) {
      setMenu(null);
      return true;
    }
    if (tagEditorId !== 0) {
      closeTagEditor();
      return true;
    }
    if (drawer) {
      setDrawer(null);
      return true;
    }
    if (selectMode) {
      setSelectMode(false);
      setTagSelection([]);
      return true;
    }
    if (activeTool && activeTool.id !== tool.DEFAULT_TOOL) {
      return false;
    }
    if (locked) {
      trigger(B.G, "ToggleLock");
    }
    trigger(B.G, "FindItCloseToggled");
    return true;
  };

  // ---------- pieces ----------

  const menuContent =
    menu &&
    {
      sort: <SortMenu onClose={() => setMenu(null)} />,
      view: <ViewMenu />,
      lot: <LotMenu onClose={() => setMenu(null)} />,
      level: <LevelMenu />,
      theme: <ThemeMenu onClose={() => setMenu(null)} />,
    }[menu.kind];

  const overlay =
    tagEditorId !== 0 ? (
      <TagDrawer />
    ) : drawer === "filters" ? (
      <FilterDrawer onClose={() => setDrawer(null)} />
    ) : drawer === "bulk" ? (
      <BulkTagDrawer ids={tagSelection} allResults={bulkAll} onClose={() => setDrawer(null)} />
    ) : null;

  const selectBar = selectMode && (
    <div className={styles.selectBar}>
      <span>{tagSelection.length === 0 ? "Click assets to pick them for tagging" : `${tagSelection.length} picked`}</span>
      <Btn
        className={classNames(styles.btn, styles.on)}
        disabled={tagSelection.length === 0}
        onSelect={() => {
          setBulkAll(false);
          setDrawer("bulk");
        }}
      >
        Tag picked
      </Btn>
      <Btn
        className={styles.btn}
        onSelect={() => {
          setBulkAll(true);
          setDrawer("bulk");
        }}
      >
        Tag all results
      </Btn>
      <Btn className={styles.btn} onSelect={toggleSelect}>
        Done
      </Btn>
    </div>
  );

  const notice = official && !ui.officialNoticeDismissed && (
    <div className={styles.notice}>
      <span>The official Find It is also switched on. Turn it off in the Paradox launcher to remove its extra toolbar buttons.</span>
      <Btn className={styles.linkBtn} onSelect={() => setUiState({ officialNoticeDismissed: true })}>
        OK
      </Btn>
    </div>
  );

  const content = (gridStyle?: { height: string }) => (
    <div className={styles.content}>
      {notice}
      {mode !== "picker" && <SubChips saved={savedView} savedTag={savedTag} onFavorites={onSaved} onTag={onTag} />}
      {mode !== "picker" && <BuildingBar menu={menu?.kind ?? null} onMenu={openMenu} />}
      {mode !== "picker" && <ActiveChips />}
      {selectBar}
      <div style={gridStyle ?? { flex: 1, display: "flex", minHeight: 0 }}>
        <Grid selectMode={selectMode} tagSelection={tagSelection} onToggleTagSelection={toggleTagSelection} onHover={onHover} />
      </div>
    </div>
  );

  const header = (
    <Header
      picker={mode === "picker"}
      menu={menu?.kind ?? null}
      filtersOpen={drawer === "filters"}
      filterCount={filterCount}
      selectMode={selectMode}
      onMenu={openMenu}
      onToggleFilters={toggleFilters}
      onToggleSelect={toggleSelect}
    />
  );

  const popover = menu && menuContent && (
    <div className={styles.pop} style={{ left: menu.left + "rem", top: menu.top + "rem" }}>
      {menuContent}
    </div>
  );

  let body: JSX.Element;

  if (mode === "picker") {
    body = (
      <div ref={areaRef} className={styles.pickerArea}>
        <div ref={dockRef} className={styles.dock} style={{ width: PICKER_WIDTH + "rem" }}>
          <div className={styles.drawerHead}>
            <div className={styles.drawerTitle}>{title}</div>
          </div>
          {header}
          {content({ height: PICKER_GRID_HEIGHT + "rem" })}
        </div>
      </div>
    );
  } else if (mode === "strip") {
    const width = stripWidth(expanded ? expandedColumn : columnSize);
    const gridHeight = stripGridHeight(expanded ? expandedRow : rowSize);
    body = (
      <div ref={areaRef} className={styles.stripArea}>
        <div ref={dockRef} className={classNames(styles.dock, styles.strip)} style={{ width: width + "rem" }}>
          {header}
          <div className={styles.body}>
            <Rail savedActive={savedTag !== null} onCategory={onCategory} onSaved={onSaved} />
            {content({ height: gridHeight + "rem" })}
            {overlay}
          </div>
          {popover}
        </div>
      </div>
    );
  } else {
    const width = collapsed ? RAIL_WIDTH : dockWidth(rightColumn);
    const cardOffset = width + 22;
    body = (
      <div ref={areaRef} className={classNames(styles.area, styles[mode])}>
        <div
          ref={dockRef}
          className={classNames(styles.dock, collapsed && styles.collapsed)}
          style={{ width: width + "rem", height: dockHeightPercent(rightRow) + "%" }}
        >
          {!collapsed && header}
          <div className={styles.body}>
            <Rail savedActive={savedTag !== null} onCategory={onCategory} onSaved={onSaved} />
            {!collapsed && content()}
            {!collapsed && overlay}
          </div>
          <Btn
            className={styles.handle}
            tooltip={collapsed ? "Show the panel" : "Fold the panel to its category rail"}
            onSelect={() => {
              setMenu(null);
              setHover(null);
              setUiState({ collapsed: !collapsed });
            }}
          >
            <Chevron direction={(mode === "left") === collapsed ? "right" : "left"} />
          </Btn>
          {!collapsed && popover}
        </div>
        {hover && !collapsed && !selectMode && <HoverCard entry={hover.entry} top={hover.top} side={mode} offset={cardOffset} />}
      </div>
    );
  }

  return (
    <InputActionConsumer actions={{ Back: onBack }} ignoreFocusState>
      {body}
    </InputActionConsumer>
  );
};

export { DOCK_SIDE };
