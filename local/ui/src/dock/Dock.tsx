import { trigger, useValue } from "cs2/api";
import { game, tool } from "cs2/bindings";
import { Panel } from "cs2/ui";
import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import * as B from "bindings";
import { LocalPrefabEntry } from "types";
import { activeChips } from "options";
import { PICKER_GRID_HEIGHT, PICKER_WIDTH, dockHeightPercent, dockWidth, pxToRem, stripGridHeight, stripWidth } from "layout";
import { DropdownTheme } from "native";
import { setUiState, useUiState } from "store";
import { MenuKind, TitleBar, Toolbar } from "./Header";
import { CategoryTabs, FAVORITE_CATEGORY, Location, SavedRow, SubTabs, selectCategory } from "./Tabs";
import { ActiveFilters } from "./Chips";
import { BuildingBar, LevelModeMenu, LotMenu } from "./BuildingBar";
import { SortMenu, ViewMenu } from "./Menus";
import { Grid, HoverCard } from "./Grid";
import { FilterDrawer } from "./FilterDrawer";
import { BulkTagDrawer, TagDrawer } from "./TagDrawer";
import { Btn } from "./controls";
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

  // Typing something other than the saved #tag leaves the Saved view.
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
  const docked = mode === "left" || mode === "right";
  const collapsed = ui.collapsed && docked;
  const savedView = savedTag !== null || category === FAVORITE_CATEGORY;

  // ---------- actions ----------

  const openMenu = (kind: MenuKind, anchor: HTMLElement | null) => {
    if (menu?.kind === kind || !anchor || !dockRef.current) {
      setMenu(null);
      return;
    }
    const dockRect = dockRef.current.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    setMenu({ kind, left: pxToRem(rect.left - dockRect.left), top: pxToRem(rect.bottom - dockRect.top) + 3 });
  };

  const closeTagEditor = () => tagEditorId !== 0 && trigger(B.G, "CloseTagEditor");

  const closePanel = () => {
    if (locked) {
      trigger(B.G, "ToggleLock");
    }
    trigger(B.G, "FindItCloseToggled");
  };

  const toggleFilters = () => {
    closeTagEditor();
    setMenu(null);
    setDrawer(drawer === "filters" ? null : "filters");
  };

  const leaveSavedTag = () => {
    if (savedTag) {
      setSavedTag(null);
      trigger(B.G, "SearchChanged", "");
    }
  };

  const onCategory = (id: number) => {
    leaveSavedTag();
    selectCategory(id);
  };

  const onSaved = () => {
    leaveSavedTag();
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
    // Keep the card below y 102 so it never covers Mod Button Manager's second row (y 56-96).
    const minTop = Math.max(0, 102 - pxToRem(areaRect.top));
    setHover({ entry, top: Math.max(minTop, Math.min(pxToRem(rect.top - areaRect.top) - 8, pxToRem(areaRect.height) - 260)) });
  };

  // Escape, innermost first: menu, tag editor, drawer, tag picking, the asset being placed,
  // then the panel itself. The native Panel routes Escape here.
  const onBack = () => {
    if (menu) return setMenu(null);
    if (tagEditorId !== 0) return closeTagEditor();
    if (drawer) return setDrawer(null);
    if (selectMode) {
      setSelectMode(false);
      setTagSelection([]);
      return;
    }
    if (activeTool && activeTool.id !== tool.DEFAULT_TOOL) {
      tool.selectTool(tool.DEFAULT_TOOL);
      return;
    }
    closePanel();
  };

  // ---------- pieces ----------

  const menuContent =
    menu &&
    {
      sort: <SortMenu onClose={() => setMenu(null)} />,
      view: <ViewMenu />,
      lot: <LotMenu onClose={() => setMenu(null)} />,
      levelMode: <LevelModeMenu onClose={() => setMenu(null)} />,
      theme: null,
    }[menu.kind];

  const popover = menu && menuContent && (
    <div className={classNames(DropdownTheme.dropdownMenu, styles.menu)} style={{ left: menu.left + "rem", top: menu.top + "rem" }}>
      {menuContent}
    </div>
  );

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
      <div className={styles.selectText}>{tagSelection.length === 0 ? "Click assets to pick them for tagging" : `${tagSelection.length} picked`}</div>
      <Btn
        className={styles.linkBtn}
        disabled={tagSelection.length === 0}
        onSelect={() => {
          setBulkAll(false);
          setDrawer("bulk");
        }}
      >
        Tag picked
      </Btn>
      <Btn
        className={styles.linkBtn}
        onSelect={() => {
          setBulkAll(true);
          setDrawer("bulk");
        }}
      >
        Tag all results
      </Btn>
      <Btn className={styles.linkBtn} onSelect={toggleSelect}>
        Done
      </Btn>
    </div>
  );

  const notice = official && !ui.officialNoticeDismissed && (
    <div className={styles.notice}>
      <div className={styles.selectText}>The official Find It is also switched on. Turn it off in the Paradox launcher.</div>
      <Btn className={styles.linkBtn} onSelect={() => setUiState({ officialNoticeDismissed: true })}>
        OK
      </Btn>
    </div>
  );

  const toolbar = (
    <Toolbar
      picker={mode === "picker"}
      menu={menu?.kind ?? null}
      filtersOpen={drawer === "filters"}
      filterCount={activeChips(options).length}
      selectMode={selectMode}
      onMenu={openMenu}
      onToggleFilters={toggleFilters}
      onToggleSelect={toggleSelect}
    />
  );

  const grid = <Grid selectMode={selectMode} tagSelection={tagSelection} onToggleTagSelection={toggleTagSelection} onHover={onHover} />;

  const browser = (gridHeight?: number) => (
    <>
      {toolbar}
      {mode !== "picker" && <CategoryTabs savedActive={savedTag !== null} onCategory={onCategory} onSaved={onSaved} />}
      <div className={styles.body}>
        {notice}
        {mode !== "picker" && <Location savedTag={savedTag} />}
        {mode !== "picker" && (savedView ? <SavedRow savedTag={savedTag} onFavorites={onSaved} onTag={onTag} /> : <SubTabs />)}
        {mode !== "picker" && <BuildingBar onMenu={openMenu} />}
        {mode !== "picker" && <ActiveFilters />}
        {selectBar}
        <div className={styles.gridSlot} style={gridHeight ? { flex: "none", height: gridHeight + "rem" } : undefined}>
          {grid}
        </div>
        {overlay}
      </div>
      {popover}
    </>
  );

  if (mode === "picker") {
    return (
      <div ref={areaRef} className={styles.pickerArea}>
        <div ref={dockRef} className={styles.frame} style={{ width: PICKER_WIDTH + "rem" }}>
          <Panel className={styles.panel} contentClassName={styles.panelContent} header={<TitleBar title={title} onClose={closePanel} />} onClose={onBack}>
            {browser(PICKER_GRID_HEIGHT)}
          </Panel>
        </div>
      </div>
    );
  }

  if (mode === "strip") {
    return (
      <div ref={areaRef} className={styles.stripArea}>
        <div ref={dockRef} className={styles.frame} style={{ width: stripWidth(expanded ? expandedColumn : columnSize) + "rem" }}>
          <Panel className={styles.panel} contentClassName={styles.panelContent} header={<TitleBar title="Find It" onClose={closePanel} />} onClose={onBack}>
            {browser(stripGridHeight(expanded ? expandedRow : rowSize))}
          </Panel>
        </div>
      </div>
    );
  }

  const width = dockWidth(rightColumn);

  return (
    <div ref={areaRef} className={classNames(styles.area, styles[mode])}>
      <div ref={dockRef} className={classNames(styles.frame, !collapsed && styles.frameFull)} style={{ width: width + "rem", height: collapsed ? undefined : dockHeightPercent(rightRow) + "%" }}>
        <Panel
          className={classNames(styles.panel, collapsed && styles.panelCollapsed)}
          contentClassName={styles.panelContent}
          header={
            <TitleBar
              title="Find It"
              collapsed={collapsed}
              onToggle={() => {
                setMenu(null);
                setHover(null);
                setUiState({ collapsed: !collapsed });
              }}
              onClose={closePanel}
            />
          }
          onClose={onBack}
        >
          {collapsed ? null : browser()}
        </Panel>
      </div>
      {hover && !collapsed && !selectMode && <HoverCard entry={hover.entry} top={hover.top} side={mode} offset={width + 12} />}
    </div>
  );
};
