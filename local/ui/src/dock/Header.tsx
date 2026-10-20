import { trigger, useValue } from "cs2/api";
import { useLocalization } from "cs2/l10n";
import { FOCUS_DISABLED } from "cs2/input";
import { useEffect, useRef } from "react";
import classNames from "classnames";
import * as B from "bindings";
import { findSection } from "options";
import { GLYPH, InputTheme, PanelDefaultTheme, PanelTheme, TextInput, ToolButtonTheme } from "native";
import { Glyph, HeaderIconBtn, ToolBtn } from "./controls";
import styles from "./dock.module.scss";
import find from "images/findit_find.svg";
import sortIcon from "images/findit_sort.svg";
import filterIcon from "images/findit_filter.svg";
import randomIcon from "images/findit_random.svg";
import lockIcon from "images/findit_lock.svg";
import unlockIcon from "images/findit_unlock.svg";
import tagIcon from "images/findit_tag.svg";
import magnifier from "images/Magnifier.svg";

export type MenuKind = "sort" | "view" | "lot" | "levelMode" | "theme";

// Native panel title bar: icon, uppercase accent title, collapse toggle, close button.
export const TitleBar = (props: { title: string; collapsed?: boolean; onToggle?: () => void; onClose: () => void }) => (
  <div className={classNames(PanelTheme.titleBar, styles.titleBar)} onClick={props.onToggle}>
    <img src={magnifier} className={PanelTheme.icon} />
    <div className={classNames(PanelTheme.title, PanelDefaultTheme.title)}>{props.title}</div>
    {props.onToggle && (
      <div onClick={(e) => e.stopPropagation()}>
        <HeaderIconBtn
          src={props.collapsed ? GLYPH.expand : GLYPH.collapse}
          className={PanelTheme.toggle}
          tooltip={props.collapsed ? "Show the panel" : "Fold the panel to its title bar"}
          onSelect={props.onToggle}
        />
      </div>
    )}
    <div onClick={(e) => e.stopPropagation()}>
      <HeaderIconBtn src={GLYPH.close} className={PanelTheme.closeButton} tooltip="Close (Esc)" onSelect={props.onClose} />
    </div>
  </div>
);

export const SearchBox = () => {
  const { translate } = useLocalization();
  const search = useValue(B.CurrentSearch$);
  const loading = useValue(B.IsSearchLoading$);
  const focus = useValue(B.FocusSearchBar$);
  const clear = useValue(B.ClearSearchBar$);
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
      {TextInput && (
        <TextInput
          ref={inputRef}
          multiline={1}
          value={search}
          disabled={false}
          type="text"
          className={classNames(InputTheme.input, styles.searchInput)}
          focusKey={FOCUS_DISABLED}
          onChange={onChange}
          placeholder={translate("Tooltip.LABEL[FindIt.SearchPlaceholderLocal]", "Search names, PDX IDs or #tags")}
        />
      )}
      <Glyph src={loading ? "coui://uil/Standard/HalfCircleProgress.svg" : find} className={classNames(styles.searchIcon, loading && styles.spin)} />
      {search.trim() !== "" && (
        <div className={styles.searchClear} onClick={() => trigger(B.G, "SearchChanged", "")}>
          <Glyph src={GLYPH.close} className={styles.searchClearIcon} />
        </div>
      )}
    </div>
  );
};

type ToolbarProps = {
  picker: boolean;
  menu: MenuKind | null;
  filtersOpen: boolean;
  filterCount: number;
  selectMode: boolean;
  onMenu: (kind: MenuKind, anchor: HTMLElement | null) => void;
  onToggleFilters: () => void;
  onToggleSelect: () => void;
};

// Search plus the tool-option buttons. Every button has a tooltip, like the game's own.
export const Toolbar = (props: ToolbarProps) => {
  const { translate } = useLocalization();
  const locked = useValue(B.IsWindowLocked$);
  const options = useValue(B.OptionsList$);
  const sorting = findSection(options, B.Section.Sorting);
  const sortName = sorting?.options.find((o) => o.selected)?.name ?? "";
  const sortRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  if (props.picker) {
    return (
      <div className={styles.toolbar}>
        <SearchBox />
      </div>
    );
  }

  return (
    <div className={styles.toolbar}>
      <SearchBox />
      <ToolBtn ref={sortRef} src={sortIcon} tooltip={sortName || "Sorting"} selected={props.menu === "sort"} onSelect={() => props.onMenu("sort", sortRef.current)} />
      <ToolBtn src={filterIcon} tooltip="Filters" selected={props.filtersOpen} onSelect={props.onToggleFilters}>
        {props.filterCount > 0 && <div className={classNames(ToolButtonTheme.badge, styles.badge)}>{props.filterCount}</div>}
      </ToolBtn>
      <ToolBtn
        ref={viewRef}
        src="coui://uil/Standard/GridView.svg"
        tooltip="View: tiles, dock side and size"
        selected={props.menu === "view"}
        onSelect={() => props.onMenu("view", viewRef.current)}
      />
      <ToolBtn src={tagIcon} tooltip="Tag several assets" selected={props.selectMode} onSelect={props.onToggleSelect} />
      <ToolBtn src={randomIcon} tooltip={translate("Tooltip.LABEL[FindIt.Random]", "Random") + " (Ctrl+R)"} onSelect={() => trigger(B.G, "OnRandomButtonClicked")} />
      <ToolBtn
        src={locked ? lockIcon : unlockIcon}
        tooltip={locked ? "Kept open while you build" : "Keep open while you build"}
        selected={locked}
        onSelect={() => trigger(B.G, "ToggleLock")}
      />
    </div>
  );
};
