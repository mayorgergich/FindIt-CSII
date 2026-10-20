import { trigger, useValue } from "cs2/api";
import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import * as B from "bindings";
import { LocalPrefabEntry } from "types";
import { TILE_GAP, pxToRem, tileSize } from "layout";
import { MaskIcon } from "./controls";
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

  // Measure after every render; tell C# when the grid changed size by more than a unit.
  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const width = Math.round(pxToRem(rect.width));
    const height = Math.round(pxToRem(rect.height));

    if (Math.abs(width - lastSent.current[0]) >= 1 || Math.abs(height - lastSent.current[1]) >= 1) {
      lastSent.current = [width, height];
      setSize([width, height]);
      trigger(B.G, "SetGridSize", width, height);
    }
  });

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
    const usable = rect.height - (thumbHeight * window.innerHeight) / 1080;
    const percent = (event.clientY - rect.top - drag) / Math.max(1, usable);
    trigger(B.G, "SetScrollIndex", Math.max(0, Math.min(1, percent)) * maxScroll);
  };

  const onTrackClick = (event: any) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const thumbTopPx = rect.top + (thumbTop * window.innerHeight) / 1080;
    const step = Math.max(1, Math.floor(rows));
    trigger(B.G, "SetScrollIndex", event.clientY < thumbTopPx ? scrollIndex - step : scrollIndex + step);
  };

  return (
    <div className={classNames(styles.gridWrap, styles[viewStyle])} onWheel={(e: any) => trigger(B.G, "OnScroll", e.deltaY)}>
      {drag !== null && <div className={styles.scrollBlocker} onMouseMove={onTrackMove} onMouseUp={() => setDrag(null)} />}
      <div ref={gridRef} className={styles.grid}>
        {list.length === 0 && !loading && <div className={styles.empty}>Nothing matches. Remove a filter above, or use Clear all.</div>}
        {size[0] > 0 &&
          list.map((entry, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            return (
              <Tile
                key={entry.id}
                entry={entry}
                left={col * (tile.width + TILE_GAP)}
                top={row * rowHeight - offset}
                width={tile.width}
                height={tile.height}
                viewStyle={viewStyle}
                selected={selected.has(entry.id)}
                tagSelected={tagSelected.has(entry.id)}
                selectMode={props.selectMode}
                noAssetImage={noAssetImage}
                onToggleTagSelection={props.onToggleTagSelection}
                onHover={props.onHover}
              />
            );
          })}
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
        <div style={{ width: "16rem" }} />
      )}
    </div>
  );
};

type TileProps = {
  entry: LocalPrefabEntry;
  left: number;
  top: number;
  width: number;
  height: number;
  viewStyle: string;
  selected: boolean;
  tagSelected: boolean;
  selectMode: boolean;
  noAssetImage: boolean;
  onToggleTagSelection: (entry: LocalPrefabEntry) => void;
  onHover: (entry: LocalPrefabEntry | null, element: HTMLElement | null) => void;
};

const Tile = (props: TileProps) => {
  const { entry } = props;
  const [hovered, setHovered] = useState(false);
  const [frame, setFrame] = useState(0);
  const tileRef = useRef<HTMLDivElement>(null);
  const tagged = (entry.tags?.length ?? 0) + (entry.creatorTags?.length ?? 0) > 0;
  const list = props.viewStyle === "ListSimple";
  const imageSize = list ? 28 : props.width;
  const thumbnails = entry.thumbnails?.length ? entry.thumbnails : [entry.fallbackThumbnail];
  const thumbnail = props.noAssetImage && !hovered ? entry.fallbackThumbnail : thumbnails[frame % thumbnails.length];

  const click = () => {
    if (props.selectMode) {
      props.onToggleTagSelection(entry);
    } else {
      trigger(B.G, "SetCurrentPrefab", entry.id);
    }
  };

  const action = (event: any, run: () => void) => {
    event.stopPropagation();
    run();
  };

  return (
    <div
      ref={tileRef}
      className={classNames(styles.tile, props.selected && styles.selected, props.tagSelected && styles.tagSelected)}
      style={{ left: props.left + "rem", top: props.top + "rem", width: props.width + "rem", height: props.height + "rem" }}
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
      <div className={styles.thumbBox} style={{ width: imageSize + "rem", height: imageSize + "rem" }}>
        <img
          className={styles.thumb}
          src={thumbnail}
          onError={(e: any) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = entry.fallbackThumbnail;
          }}
        />
      </div>
      <div className={styles.tileName}>{entry.name}</div>
      {entry.favorited && <MaskIcon src={starFilled} className={styles.badgeFav} />}
      {entry.hot && <div className={styles.badgeHot}>!</div>}
      {entry.random && props.viewStyle !== "GridSmall" && <MaskIcon src={shuffle} className={styles.badgeRandom} />}
      {!props.selectMode && props.viewStyle !== "GridSmall" && (
        <div className={styles.acts}>
          <div
            className={classNames(styles.act, entry.favorited && styles.on)}
            onClick={(e) => action(e, () => trigger(B.G, "ToggleFavorited", entry.id))}
          >
            <MaskIcon src={entry.favorited ? starFilled : star} className={styles.actIcon} />
          </div>
          <div className={classNames(styles.act, tagged && styles.on)} onClick={(e) => action(e, () => trigger(B.G, "OpenTagEditor", entry.id))}>
            <MaskIcon src={tagged ? tagFilled : tagIcon} className={styles.actIcon} />
          </div>
          {entry.placed > 0 && (
            <div className={styles.act} onClick={(e) => action(e, () => trigger(B.G, "OnLocateButtonClicked", entry.id))}>
              <MaskIcon src={placedIcon} className={styles.actIcon} />
            </div>
          )}
          {entry.pdxId > 0 && (
            <div className={styles.act} onClick={(e) => action(e, () => trigger(B.G, "OnPdxModsButtonClicked", entry.id))}>
              <img src="assetdb://gameui/Media/Glyphs/ParadoxModsCloud.svg" style={{ width: "14rem", height: "14rem" }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Details for the hovered tile, shown beside the dock (never over it).
export const HoverCard = (props: { entry: LocalPrefabEntry; top: number; side: "left" | "right"; offset: number }) => {
  const e = props.entry;
  const lot = e.lotWidth > 0 ? `${e.lotWidth}×${e.lotDepth} lot` : "";
  const line1 = [e.subCategoryName, e.zone.replace(/"/g, "").replace(/ Buildings$/, ""), e.level > 0 ? `Level ${e.level}` : "", lot]
    .filter((x) => x)
    .join(" · ");
  const source = e.packNames.length > 0 ? e.packNames.join(", ") : e.vanilla ? "Base game" : "";
  const tags = (e.creatorTags ?? []).concat(e.tags ?? []);
  const position = props.side === "left" ? { left: props.offset + "rem" } : { right: props.offset + "rem" };

  return (
    <div className={styles.card} style={{ ...position, top: props.top + "rem" }}>
      <div className={styles.cardImg}>
        <img src={e.thumbnails?.[0] ?? e.fallbackThumbnail} />
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>{e.name}</div>
        {line1 && <div className={styles.cardRow}>{line1}</div>}
        {(e.themeName || source) && <div className={styles.cardRow}>{[e.themeName, source].filter((x) => x).join(" · ")}</div>}
        {e.hasParking && <div className={styles.cardRow}>Has parking</div>}
        {e.placed > 0 && <div className={styles.cardRow}>Placed {e.placed} {e.placed === 1 ? "time" : "times"} in this city</div>}
        {e.hot && <div className={styles.cardWarn}>May affect performance</div>}
        {tags.length > 0 && (
          <div className={styles.cardTags}>
            {tags.map((t) => (
              <div key={t} className={styles.cardTag}>
                #{t}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
