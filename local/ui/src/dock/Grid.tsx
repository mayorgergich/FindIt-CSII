import { trigger, useValue } from "cs2/api";
import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import * as B from "bindings";
import { LocalPrefabEntry } from "types";
import { NAME_HEIGHT, TILE_GAP, pxPerRem, pxToRem, tileSize } from "layout";
import { DetailTheme, ItemGridTheme, PropertyTheme } from "native";
import { Glyph } from "./controls";
import styles from "./dock.module.scss";
import star from "images/findit_star.svg";
import starFilled from "images/findit_starFilled.svg";
import tagIcon from "images/findit_tag.svg";
import tagFilled from "images/findit_tagFilled.svg";
import placedIcon from "images/findit_placed.svg";
import shuffle from "images/findit_shuffle.svg";

type GridProps = {
  selectMode: boolean;
  tagSelection: number[];
  onToggleTagSelection: (entry: LocalPrefabEntry) => void;
  onHover: (entry: LocalPrefabEntry | null, element: HTMLElement | null) => void;
};

// Virtualized grid: C# sends only the visible window of assets (PrefabList), starting at
// floor(ScrollIndex) rows. The grid reports its real size so C# picks columns/rows to match.
export const Grid = (props: GridProps) => {
  const list = useValue(B.PrefabList$);
  const viewStyle = useValue(B.ViewStyle$);
  const columns = useValue(B.ColumnCount$);
  const rows = useValue(B.RowCount$);
  const scrollIndex = useValue(B.ScrollIndex$);
  const maxScroll = useValue(B.MaxScrollIndex$);
  const activeId = useValue(B.ActivePrefabId$);
  const multiSelected = useValue(B.SelectedPrefabIds$);
  const noAssetImage = useValue(B.NoAssetImage$);
  const loading = useValue(B.IsSearchLoading$);
  const gridRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastSent = useRef<[number, number]>([0, 0]);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [drag, setDrag] = useState<number | null>(null);

  // Tell C# when the grid changed size by a unit or more.
  const measure = () => {
    const element = gridRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const width = Math.round(pxToRem(rect.width));
    const height = Math.round(pxToRem(rect.height));

    if (width <= 0 || height <= 0) return; // not laid out yet

    if (Math.abs(width - lastSent.current[0]) >= 1 || Math.abs(height - lastSent.current[1]) >= 1) {
      lastSent.current = [width, height];
      setSize([width, height]);
      trigger(B.G, "SetGridSize", width, height);
    }
  };

  // After every render, and a few times a second: Gameface lays out after React's effects run, so
  // a fresh grid reads 0x0 at first, and layout changes that don't re-render React (the panel's
  // height, the toolbar, a stylesheet) would otherwise go unnoticed. Seen in-game 2026-10-20.
  useEffect(measure);
  useEffect(() => {
    const id = window.setInterval(measure, 250);
    return () => window.clearInterval(id);
  }, []);

  const tile = tileSize(viewStyle, size[0], columns);
  const rowHeight = tile.height + TILE_GAP;
  const offset = (scrollIndex % 1) * rowHeight;
  const tagSelected = new Set(props.tagSelection);
  const selected = multiSelected && multiSelected.length > 0 ? new Set(multiSelected) : new Set([activeId]);
  const cols = Math.max(1, columns);

  const trackHeight = Math.max(0, size[1]);
  const thumbHeight = Math.max(30, (trackHeight * rows) / Math.max(rows, maxScroll + rows));
  const thumbTop = maxScroll > 0 ? (scrollIndex / maxScroll) * (trackHeight - thumbHeight) : 0;

  const onTrackMove = (event: any) => {
    if (drag === null || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const usable = rect.height - thumbHeight * pxPerRem();
    const percent = (event.clientY - rect.top - drag) / Math.max(1, usable);
    trigger(B.G, "SetScrollIndex", Math.max(0, Math.min(1, percent)) * maxScroll);
  };

  const onTrackClick = (event: any) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const thumbTopPx = rect.top + thumbTop * pxPerRem();
    const step = Math.max(1, Math.floor(rows));
    trigger(B.G, "SetScrollIndex", event.clientY < thumbTopPx ? scrollIndex - step : scrollIndex + step);
  };

  return (
    <div className={classNames(styles.gridWrap, styles[viewStyle])} onWheel={(e: any) => trigger(B.G, "OnScroll", e.deltaY)}>
      {drag !== null && <div className={styles.scrollBlocker} onMouseMove={onTrackMove} onMouseUp={() => setDrag(null)} />}
      <div ref={gridRef} className={styles.grid}>
        {list.length === 0 && !loading && <div className={styles.empty}>No assets match. Remove a filter above, or clear them all.</div>}
        {size[0] > 0 &&
          list.map((entry, i) => (
            <Tile
              key={entry.id}
              entry={entry}
              left={(i % cols) * (tile.width + TILE_GAP)}
              top={Math.floor(i / cols) * rowHeight - offset}
              width={tile.width}
              imageHeight={tile.height - (viewStyle === "GridWithText" ? NAME_HEIGHT : 0)}
              viewStyle={viewStyle}
              selected={selected.has(entry.id)}
              tagSelected={tagSelected.has(entry.id)}
              selectMode={props.selectMode}
              noAssetImage={noAssetImage}
              onToggleTagSelection={props.onToggleTagSelection}
              onHover={props.onHover}
            />
          ))}
      </div>
      {maxScroll > 0 ? (
        <div ref={trackRef} className={styles.scrollTrack} onClick={onTrackClick}>
          <div
            className={styles.scrollThumb}
            style={{ top: thumbTop + "rem", height: thumbHeight + "rem" }}
            onClick={(e: any) => e.stopPropagation()}
            onMouseDown={(e: any) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setDrag(e.clientY - rect.top);
            }}
          />
        </div>
      ) : (
        <div className={styles.scrollTrackEmpty} />
      )}
    </div>
  );
};

type TileProps = {
  entry: LocalPrefabEntry;
  left: number;
  top: number;
  width: number;
  imageHeight: number;
  viewStyle: string;
  selected: boolean;
  tagSelected: boolean;
  selectMode: boolean;
  noAssetImage: boolean;
  onToggleTagSelection: (entry: LocalPrefabEntry) => void;
  onHover: (entry: LocalPrefabEntry | null, element: HTMLElement | null) => void;
};

// An asset tile with the vanilla asset menu's classes: same shape, colours, hover and selection,
// DLC badge top-right and theme badge bottom-left. Find It adds the favourite star and, on hover,
// favourite / tag / locate / PDX Mods buttons.
const Tile = (props: TileProps) => {
  const { entry } = props;
  const [hovered, setHovered] = useState(false);
  const [frame, setFrame] = useState(0);
  const tileRef = useRef<HTMLDivElement>(null);
  const tagged = (entry.tags?.length ?? 0) + (entry.creatorTags?.length ?? 0) > 0;
  const list = props.viewStyle === "ListSimple";
  const thumbnails = entry.thumbnails?.length ? entry.thumbnails : [entry.fallbackThumbnail];
  const thumbnail = props.noAssetImage && !hovered ? entry.fallbackThumbnail : thumbnails[frame % thumbnails.length];
  const imageSize = list ? 24 : Math.min(props.width, props.imageHeight) * 0.94;
  const small = props.viewStyle === "GridSmall";

  const click = () => {
    if (props.selectMode) {
      props.onToggleTagSelection(entry);
    } else {
      trigger(B.G, "SetCurrentPrefab", entry.id);
    }
  };

  const act = (event: any, run: () => void) => {
    event.stopPropagation();
    run();
  };

  return (
    <>
      <div
        ref={tileRef}
        className={classNames(
          list ? styles.listItem : ItemGridTheme.item,
          styles.tile,
          props.selected && "selected",
          props.selected && styles.tileSelected,
          props.tagSelected && styles.tagSelected,
        )}
        style={{ left: props.left + "rem", top: props.top + "rem", width: props.width + "rem", height: (list ? 28 : props.imageHeight) + "rem" }}
        onClick={click}
        onMouseEnter={() => {
          setHovered(true);
          props.onHover(entry, tileRef.current);
        }}
        onMouseLeave={() => {
          setHovered(false);
          props.onHover(null, null);
        }}
        onMouseMove={entry.random ? () => setFrame(Math.floor(Date.now() / 400)) : undefined}
      >
        <img
          className={classNames(ItemGridTheme.thumbnail, styles.thumb)}
          src={thumbnail}
          style={{ width: imageSize + "rem", height: imageSize + "rem" }}
          onError={(e: any) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = entry.fallbackThumbnail;
          }}
        />
        {list && <div className={styles.listName}>{entry.name}</div>}
        {!small && !list && entry.dlcThumbnail && <img src={entry.dlcThumbnail} className={classNames(ItemGridTheme.dlc, styles.badge18)} />}
        {!small && !list && entry.themeThumbnail && <img src={entry.themeThumbnail} className={classNames(ItemGridTheme.theme, styles.badge18)} />}
        {entry.favorited && <Glyph src={starFilled} className={styles.favBadge} />}
        {entry.hot && <div className={styles.hotBadge}>!</div>}
        {entry.random && !small && <Glyph src={shuffle} className={styles.randomBadge} />}
        {!props.selectMode && !small && (
          <div className={styles.acts}>
            <div className={classNames(styles.act, entry.favorited && styles.actOn)} onClick={(e) => act(e, () => trigger(B.G, "ToggleFavorited", entry.id))}>
              <Glyph src={entry.favorited ? starFilled : star} className={styles.actIcon} />
            </div>
            <div className={classNames(styles.act, tagged && styles.actOn)} onClick={(e) => act(e, () => trigger(B.G, "OpenTagEditor", entry.id))}>
              <Glyph src={tagged ? tagFilled : tagIcon} className={styles.actIcon} />
            </div>
            {entry.placed > 0 && (
              <div className={styles.act} onClick={(e) => act(e, () => trigger(B.G, "OnLocateButtonClicked", entry.id))}>
                <Glyph src={placedIcon} className={styles.actIcon} />
              </div>
            )}
            {entry.pdxId > 0 && (
              <div className={styles.act} onClick={(e) => act(e, () => trigger(B.G, "OnPdxModsButtonClicked", entry.id))}>
                <img src="assetdb://gameui/Media/Glyphs/ParadoxModsCloud.svg" className={styles.actIcon} />
              </div>
            )}
          </div>
        )}
      </div>
      {props.viewStyle === "GridWithText" && (
        <div className={styles.tileName} style={{ left: props.left + "rem", top: props.top + props.imageHeight + "rem", width: props.width + "rem" }}>
          {entry.name}
        </div>
      )}
    </>
  );
};

const Property = (props: { header: string; value: string }) => (
  <div className={PropertyTheme.field}>
    <div className={PropertyTheme.header}>{props.header}</div>
    <div className={PropertyTheme.content}>
      <div className={PropertyTheme.value}>{props.value}</div>
    </div>
  </div>
);

// Details for the hovered tile, drawn with the vanilla asset detail panel's classes and shown
// beside the dock (never over it).
export const HoverCard = (props: { entry: LocalPrefabEntry; top: number; side: "left" | "right"; offset: number }) => {
  const e = props.entry;
  const zone = e.zone.replace(/"/g, "").replace(/ Buildings$/, "");
  const kind = [e.subCategoryName, zone].filter((x) => x).join(" · ");
  const source = e.packNames.length > 0 ? e.packNames.join(", ") : e.vanilla ? "Base game" : "";
  const tags = (e.creatorTags ?? []).concat(e.tags ?? []);
  const position = props.side === "left" ? { left: props.offset + "rem" } : { right: props.offset + "rem" };
  const properties: [string, string][] = [];
  if (e.lotWidth > 0) properties.push(["Lot", `${e.lotWidth}×${e.lotDepth}`]);
  if (e.level > 0) properties.push(["Level", String(e.level)]);
  if (e.themeName) properties.push(["Theme", e.themeName]);
  if (e.hasParking) properties.push(["Parking", "Yes"]);
  if (e.placed > 0) properties.push(["Placed", String(e.placed)]);

  return (
    <div className={classNames(DetailTheme.assetDetailPanel, styles.card)} style={{ ...position, top: props.top + "rem" }}>
      <div className={DetailTheme.titleBar}>
        <div className={classNames(DetailTheme.title, styles.cardTitle)}>{e.name}</div>
      </div>
      <div className={classNames(DetailTheme.content, properties.length === 0 && DetailTheme.lastRow)}>
        <div className={DetailTheme.scrollContent}>
          <div className={DetailTheme.previewContainer}>
            <img className={DetailTheme.preview} src={e.thumbnails?.[0] ?? e.fallbackThumbnail} />
          </div>
          <div className={DetailTheme.column}>
            {kind && <div className={DetailTheme.description}>{kind}</div>}
            {source && <div className={classNames(DetailTheme.description, styles.cardDim)}>{source}</div>}
            {e.hot && <div className={styles.cardWarn}>May affect performance</div>}
            {tags.length > 0 && <div className={styles.cardTags}>{tags.map((t) => "#" + t).join("  ")}</div>}
          </div>
        </div>
      </div>
      {properties.length > 0 && (
        <div className={classNames(DetailTheme.statsRow, DetailTheme.lastRow)}>
          {properties.map(([header, value]) => (
            <Property key={header} header={header} value={value} />
          ))}
        </div>
      )}
    </div>
  );
};
