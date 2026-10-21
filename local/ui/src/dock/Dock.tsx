import { trigger, useValue } from "cs2/api";
import { game, tool } from "cs2/bindings";
import { Panel } from "cs2/ui";
import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import * as B from "bindings";
import { LocalPrefabEntry } from "types";
import { activeChips, clickOption } from "options";
import {
  CARD_WIDTH,
  CLICK_SLOP,
  DOCK_SIDE,
  DOCK_TOP,
  FLOAT_DEFAULT_HEIGHT,
  FLOAT_MIN_WIDTH,
  MENU_WIDTH,
  PICKER_GRID_HEIGHT,
  PICKER_WIDTH,
  Rect,
  SNAP_ZONE,
  UNDOCK_DISTANCE,
  clamp,
  clampRect,
  defaultFloatRect,
  dockHeightPercent,
  dockWidth,
  pxToRem,
  screenKey,
  screenRem,
  stripGridHeight,
  stripWidth,
} from "layout";
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
type Edges = { left?: boolean; right?: boolean; bottom?: boolean };
// A press on the title bar or a resize handle. "moved" turns true once it's a real drag; a move
// that never gets there is a click.
type Drag = { kind: "move" | "resize"; edges: Edges; mouseX: number; mouseY: number; start: Rect; fromDock: boolean; moved: boolean };

const RIGHT_DOCK_SIDE = 58; // matches .area.right in dock.module.scss

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
  // Drag state lives in refs (mouse events can outrun renders); "dragging" only shows the layer.
  const dragRef = useRef<Drag | null>(null);
  const liveRef = useRef<Rect | null>(null);
  const snapRef = useRef<"left" | "right" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [live, setLive] = useState<Rect | null>(null);
  const [snap, setSnap] = useState<"left" | "right" | null>(null);
  const [, setScreenVersion] = useState(0);
  const open = shown || locked;

  // Switching between the monitor and the iPad changes the screen in rem; re-clamp the window.
  useEffect(() => {
    const onResize = () => setScreenVersion((v) => v + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const mode: "picker" | "strip" | "float" | "left" | "right" = picker
    ? "picker"
    : ui.floating
      ? "float"
      : alignment === "Center"
        ? "strip"
        : alignment === "Right"
          ? "right"
          : "left";
  const docked = mode === "left" || mode === "right";
  const collapsed = ui.collapsed && (docked || mode === "float");
  const width = dockWidth(rightColumn);
  const floatRect = clampRect(live ?? ui.rects[screenKey()] ?? defaultFloatRect(width), collapsed);
  const savedView = savedTag !== null || category === FAVORITE_CATEGORY;

  // ---------- actions ----------

  const openMenu = (kind: MenuKind, anchor: HTMLElement | null) => {
    if (menu?.kind === kind || !anchor || !dockRef.current) {
      setMenu(null);
      return;
    }
    const dockRect = dockRef.current.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    // Open at the button, but slide left as needed so the whole menu stays inside the dock.
    const maxLeft = Math.max(4, pxToRem(dockRect.width) - MENU_WIDTH - 6);
    setMenu({ kind, left: clamp(pxToRem(rect.left - dockRect.left), 4, maxLeft), top: pxToRem(rect.bottom - dockRect.top) + 3 });
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
    // Keep the card below Mod Button Manager's bar (DOCK_TOP).
    const minTop = Math.max(0, DOCK_TOP - pxToRem(areaRect.top));
    setHover({ entry, top: Math.max(minTop, Math.min(pxToRem(rect.top - areaRect.top) - 8, pxToRem(areaRect.height) - 260)) });
  };

  const toggleCollapsed = () => {
    setMenu(null);
    setHover(null);
    setUiState({ collapsed: !ui.collapsed });
  };

  // ---------- moving and resizing ----------

  const pointer = (event: any) => ({ x: pxToRem(event.clientX), y: pxToRem(event.clientY) });

  const frameRect = (): Rect | null => {
    if (!dockRef.current) return null;
    const r = dockRef.current.getBoundingClientRect();
    return { x: pxToRem(r.left), y: pxToRem(r.top), w: pxToRem(r.width), h: pxToRem(r.height) };
  };

  const showLive = (rect: Rect | null, snapTo: "left" | "right" | null = null) => {
    liveRef.current = rect;
    snapRef.current = snapTo;
    setLive(rect);
    setSnap(snapTo);
  };

  const beginDrag = (drag: Drag) => {
    dragRef.current = drag;
    setMenu(null);
    setHover(null);
    setDragging(true);
  };

  // Title bar press: moves a floating window; a docked one comes loose once dragged a little.
  const startMove = (event: any) => {
    if (event.button !== undefined && event.button !== 0) return;
    // No default action: a browser would start a text selection, and the next drag inside it
    // becomes a drag-and-drop that swallows the mouse events (Parking Lot Tool saw this).
    event.preventDefault?.();
    const start = mode === "float" ? floatRect : frameRect();
    if (!start) return;
    const p = pointer(event);
    beginDrag({ kind: "move", edges: {}, mouseX: p.x, mouseY: p.y, start, fromDock: mode !== "float", moved: false });
  };

  const startResize = (edges: Edges) => (event: any) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.stopPropagation?.();
    event.preventDefault?.();
    const p = pointer(event);
    beginDrag({ kind: "resize", edges, mouseX: p.x, mouseY: p.y, start: floatRect, fromDock: false, moved: true });
    showLive(floatRect);
  };

  const onDragMove = (event: any) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = pointer(event);
    const dx = p.x - drag.mouseX;
    const dy = p.y - drag.mouseY;

    if (drag.kind === "resize") {
      const r = { ...drag.start };
      if (drag.edges.right) r.w = drag.start.w + dx;
      if (drag.edges.bottom) r.h = drag.start.h + dy;
      if (drag.edges.left) {
        const w = clamp(drag.start.w - dx, FLOAT_MIN_WIDTH, drag.start.x + drag.start.w);
        r.x = drag.start.x + drag.start.w - w;
        r.w = w;
      }
      showLive(clampRect(r, false));
      return;
    }

    if (!drag.moved) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < (drag.fromDock ? UNDOCK_DISTANCE : CLICK_SLOP)) return;

      if (drag.fromDock) {
        // Come loose at the last floating size, keeping the grabbed point under the pointer.
        const saved = ui.rects[screenKey()];
        const w = saved?.w ?? drag.start.w;
        const h = saved?.h ?? Math.min(FLOAT_DEFAULT_HEIGHT, drag.start.h);
        const grabX = Math.min(drag.mouseX - drag.start.x, w - 40);
        drag.start = { x: drag.mouseX - grabX, y: drag.start.y, w, h };
        setUiState({ floating: true });
      }

      drag.moved = true;
    }

    const s = screenRem();
    const snapTo = p.x <= SNAP_ZONE ? "left" : p.x >= s.w - SNAP_ZONE ? "right" : null;
    showLive(clampRect({ ...drag.start, x: drag.start.x + dx, y: drag.start.y + dy }, collapsed), snapTo);
  };

  const endDrag = () => {
    const drag = dragRef.current;
    const rect = liveRef.current;
    const snapTo = snapRef.current;
    dragRef.current = null;
    setDragging(false);
    showLive(null);

    if (!drag) return;

    if (drag.kind === "move" && !drag.moved) {
      toggleCollapsed(); // a press that didn't move: the title bar's click
      return;
    }

    const rects = rect ? { ...ui.rects, [screenKey()]: rect } : ui.rects;

    if (drag.kind === "move" && snapTo) {
      setUiState({ floating: false, rects });
      if (alignment !== (snapTo === "right" ? "Right" : "Left")) {
        clickOption(B.Section.Alignment, snapTo === "right" ? 3 : 1);
      }
      return;
    }

    setUiState({ rects });
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
      <div className={styles.selectActions}>
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
          <Panel className={styles.panel} contentClassName={styles.panelContent} header={<TitleBar title={title} />} onClose={onBack}>
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
          <Panel className={styles.panel} contentClassName={styles.panelContent} header={<TitleBar title="Find It" />} onClose={onBack}>
            {browser(stripGridHeight(expanded ? expandedRow : rowSize))}
          </Panel>
        </div>
      </div>
    );
  }

  const titleBar = (
    <TitleBar title="Find It" collapsed={collapsed} onToggle={toggleCollapsed} onDragStart={startMove} />
  );

  // While a press or drag is on, a see-through layer over the whole screen takes the mouse, so a
  // fast drag that leaves the title bar or a handle keeps going (Parking Lot Tool does the same).
  const dragLayer = dragging && <div className={styles.dragLayer} onMouseMove={onDragMove} onMouseUp={endDrag} onMouseLeave={endDrag} />;

  // Where the window will dock if released now.
  const snapPreview = (() => {
    if (!snap) return null;
    const s = screenRem();
    const left = snap === "left" ? DOCK_SIDE : s.w - RIGHT_DOCK_SIDE - width;
    return <div className={styles.snapPreview} style={{ left: left + "rem", top: DOCK_TOP + "rem", width: width + "rem", height: s.h - s.bottom - DOCK_TOP + "rem" }} />;
  })();

  if (mode === "float") {
    const r = floatRect;
    const s = screenRem();
    // The hover card goes beside the window, on whichever side has room.
    const cardLeft = r.x + r.w + 12 + CARD_WIDTH <= s.w ? r.x + r.w + 12 : Math.max(0, r.x - 12 - CARD_WIDTH);

    return (
      <>
        <div ref={areaRef} className={styles.floatArea}>
          {snapPreview}
          <div
            ref={dockRef}
            className={classNames(styles.frame, styles.floatFrame, !collapsed && styles.frameFull)}
            style={{ left: r.x + "rem", top: r.y + "rem", width: r.w + "rem", height: collapsed ? undefined : r.h + "rem" }}
          >
            <Panel className={classNames(styles.panel, collapsed && styles.panelCollapsed)} contentClassName={styles.panelContent} header={titleBar} onClose={onBack}>
              {collapsed ? null : browser()}
            </Panel>
            {!collapsed && (
              <>
                <div className={classNames(styles.resize, styles.resizeLeft)} onMouseDown={startResize({ left: true })} />
                <div className={classNames(styles.resize, styles.resizeRight)} onMouseDown={startResize({ right: true })} />
                <div className={classNames(styles.resize, styles.resizeBottom)} onMouseDown={startResize({ bottom: true })} />
                <div className={classNames(styles.resize, styles.resizeCornerLeft)} onMouseDown={startResize({ left: true, bottom: true })} />
                <div className={classNames(styles.resize, styles.resizeCornerRight)} onMouseDown={startResize({ right: true, bottom: true })}>
                  <div className={styles.grip} />
                </div>
              </>
            )}
          </div>
          {hover && !collapsed && !selectMode && !dragging && <HoverCard entry={hover.entry} top={hover.top} side="left" offset={cardLeft} />}
        </div>
        {dragLayer}
      </>
    );
  }

  return (
    <>
      <div ref={areaRef} className={classNames(styles.area, styles[mode])}>
        <div ref={dockRef} className={classNames(styles.frame, !collapsed && styles.frameFull)} style={{ width: width + "rem", height: collapsed ? undefined : dockHeightPercent(rightRow) + "%" }}>
          <Panel className={classNames(styles.panel, collapsed && styles.panelCollapsed)} contentClassName={styles.panelContent} header={titleBar} onClose={onBack}>
            {collapsed ? null : browser()}
          </Panel>
        </div>
        {hover && !collapsed && !selectMode && !dragging && <HoverCard entry={hover.entry} top={hover.top} side={mode} offset={width + 12} />}
      </div>
      {dragLayer}
    </>
  );
};
