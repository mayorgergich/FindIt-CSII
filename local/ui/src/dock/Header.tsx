import { trigger, useValue } from "cs2/api";
import { Theme } from "cs2/bindings";
import { getModule } from "cs2/modding";
import { useLocalization } from "cs2/l10n";
import { FOCUS_DISABLED } from "cs2/input";
import { useEffect, useRef } from "react";
import classNames from "classnames";
import * as B from "bindings";
import { findSection } from "options";
import { Btn, Caret, MaskIcon } from "./controls";
import styles from "./dock.module.scss";
import find from "images/findit_find.svg";
import sortIcon from "images/findit_sort.svg";
import filterIcon from "images/findit_filter.svg";
import randomIcon from "images/findit_random.svg";
import lockIcon from "images/findit_lock.svg";
import unlockIcon from "images/findit_unlock.svg";
import tagIcon from "images/findit_tag.svg";

const TextInput = getModule("game-ui/common/input/text/text-input.tsx", "TextInput");
const TextInputTheme: Theme | any = getModule("game-ui/editor/widgets/item/editor-item.module.scss", "classes");

export type MenuKind = "sort" | "view" | "lot" | "level" | "theme";

type Props = {
  picker: boolean;
  menu: MenuKind | null;
  filtersOpen: boolean;
  filterCount: number;
  selectMode: boolean;
  onMenu: (kind: MenuKind, anchor: HTMLElement | null) => void;
  onToggleFilters: () => void;
  onToggleSelect: () => void;
};

export const SearchBox = () => {
  const { translate } = useLocalization();
  const search = useValue(B.CurrentSearch$);
  const loading = useValue(B.IsSearchLoading$);
  const focus = useValue(B.FocusSearchBar$);
  const clear = useValue(B.ClearSearchBar$);
  const count = useValue(B.PrefabCount$);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (!focus) return;
    trigger(B.G, "OnSearchFocused");
    inputRef.current?.focus?.();
    inputRef.current?.select?.();
  }, [focus]);

  useEffect(() => {
    if (!clear) return;
    trigger(B.G, "OnSearchCleared");
    trigger(B.G, "SearchChanged", "");
  }, [clear]);

  const onChange = (event: Event) => {
    const target = event?.target as HTMLTextAreaElement | null;
    trigger(B.G, "SearchChanged", target?.value ?? "");
  };

  return (
    <div className={styles.search}>
      <TextInput
        ref={inputRef}
        multiline={1}
        value={search}
        disabled={false}
        type="text"
        className={classNames(TextInputTheme.input, styles.searchInput)}
        focusKey={FOCUS_DISABLED}
        onChange={onChange}
        placeholder={translate("Editor.SEARCH_PLACEHOLDER", "Search names, PDX IDs or #tags")}
      />
      <MaskIcon
        src={loading ? "coui://uil/Standard/HalfCircleProgress.svg" : find}
        className={classNames(styles.searchIcon, loading && styles.spin)}
      />
      {search.trim() !== "" ? (
        <Btn className={styles.clearSearch} tooltip="Clear search" onSelect={() => trigger(B.G, "SearchChanged", "")}>
          <MaskIcon src="coui://uil/Standard/XClose.svg" className={styles.actIcon} />
        </Btn>
      ) : (
        <div className={styles.count}>{count}</div>
      )}
    </div>
  );
};

export const Header = (props: Props) => {
  const { translate } = useLocalization();
  const locked = useValue(B.IsWindowLocked$);
  const options = useValue(B.OptionsList$);
  const sorting = findSection(options, B.Section.Sorting);
  const sortOrder = findSection(options, B.Section.SortOrder);
  const sortName = sorting?.options.find((o) => o.selected)?.name ?? "Sort";
  const descending = sortOrder?.options[1]?.selected ?? false;
  const sortRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  const close = (
    <Btn
      className={classNames(styles.btn, styles.iconBtn)}
      tooltip={translate("Tooltip.LABEL[FindIt.ClosePanel]", "Close Panel")}
      onSelect={() => trigger(B.G, "FindItCloseToggled")}
    >
      <MaskIcon src="coui://uil/Standard/XClose.svg" className={styles.btnIcon} />
    </Btn>
  );

  if (props.picker) {
    return (
      <div className={styles.head}>
        <div className={styles.headRow}>
          <SearchBox />
          {close}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.head}>
      <div className={styles.headRow}>
        <SearchBox />
        <Btn
          className={classNames(styles.btn, styles.iconBtn, locked && styles.on)}
          tooltip={locked ? "Panel stays open while you build (click to let it close)" : "Keep the panel open while you build"}
          onSelect={() => trigger(B.G, "ToggleLock")}
        >
          <MaskIcon src={locked ? lockIcon : unlockIcon} className={styles.btnIcon} />
        </Btn>
        {close}
      </div>
      <div className={styles.headRow}>
        <Btn
          ref={sortRef}
          className={classNames(styles.btn, props.menu === "sort" && styles.on)}
          tooltip={descending ? "Sort order: descending" : "Sort order: ascending"}
          onSelect={() => props.onMenu("sort", sortRef.current)}
        >
          <MaskIcon src={sortIcon} className={styles.btnIcon} />
          <div className={styles.btnText}>{shortSortName(sortName)}</div>
          <Caret />
        </Btn>
        <Btn className={classNames(styles.btn, props.filtersOpen && styles.on)} tooltip="All filters" onSelect={props.onToggleFilters}>
          <MaskIcon src={filterIcon} className={styles.btnIcon} />
          <div className={styles.btnText}>Filters</div>
          {props.filterCount > 0 && <div className={styles.badge}>{props.filterCount}</div>}
        </Btn>
        <Btn
          ref={viewRef}
          className={classNames(styles.btn, props.menu === "view" && styles.on)}
          tooltip="Tile style, dock side and size"
          onSelect={() => props.onMenu("view", viewRef.current)}
        >
          <MaskIcon src="coui://uil/Standard/GridView.svg" className={styles.btnIcon} />
          <div className={styles.btnText}>View</div>
          <Caret />
        </Btn>
        <div className={styles.spacer} />
        <Btn
          className={classNames(styles.btn, styles.iconBtn, props.selectMode && styles.on)}
          tooltip="Tag several assets: pick them, or tag every result"
          onSelect={props.onToggleSelect}
        >
          <MaskIcon src={tagIcon} className={styles.btnIcon} />
        </Btn>
        <Btn
          className={classNames(styles.btn, styles.iconBtn)}
          tooltip={translate("Tooltip.LABEL[FindIt.Random]", "Random") + " (Ctrl+R)"}
          onSelect={() => trigger(B.G, "OnRandomButtonClicked")}
        >
          <MaskIcon src={randomIcon} className={styles.btnIcon} />
        </Btn>
      </div>
    </div>
  );
};

// "Sort by most recently installed from PDX Mods" -> a short button label.
function shortSortName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("lot")) return "Lot size";
  if (n.includes("installed")) return "Installed";
  if (n.includes("updated")) return "Updated";
  if (n.includes("most used")) return "Most used";
  if (n.includes("recent") || n.includes("last")) return "Recent";
  if (n.includes("order")) return "Game order";
  if (n.includes("name")) return "Name";
  return name;
}
