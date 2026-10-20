import { trigger, useValue } from "cs2/api";
import { Tooltip } from "cs2/ui";
import classNames from "classnames";
import * as B from "bindings";
import { TabBarTheme, TabItemTheme } from "native";
import { Btn } from "./controls";
import styles from "./dock.module.scss";

export const FAVORITE_CATEGORY = 0;
const ANY = -1;

export const selectCategory = (id: number) => trigger(B.G, "SetCurrentCategory", id);

// A tab in the vanilla asset menu's style (rounded top, highlight gradient when selected).
const Tab = (props: { icon: string; tooltip: string; selected: boolean; small?: boolean; onSelect: () => void }) => (
  <Tooltip tooltip={props.tooltip}>
    <Btn className={classNames(TabItemTheme.button, styles.tab, props.small && styles.tabSmall, props.selected && "selected")} selected={props.selected} onSelect={props.onSelect}>
      <img src={props.icon} className={classNames(TabItemTheme.icon, styles.tabIcon)} />
    </Btn>
  </Tooltip>
);

// Top row: categories, then Saved (favourites and tags) at the end, like the vanilla tab bar.
export const CategoryTabs = (props: { savedActive: boolean; onCategory: (id: number) => void; onSaved: () => void }) => {
  const categories = useValue(B.CategoryList$);
  const current = useValue(B.CurrentCategory$);
  const favorite = categories.find((c) => c.id === FAVORITE_CATEGORY);

  return (
    <div className={classNames(TabBarTheme.assetCategoryTabBar, styles.tabBar)}>
      <div className={classNames(TabBarTheme.items, styles.tabItems)}>
        {categories
          .filter((c) => c.id !== FAVORITE_CATEGORY)
          .map((c) => (
            <Tab key={c.id} icon={c.icon} tooltip={c.toolTip} selected={!props.savedActive && current === c.id} onSelect={() => props.onCategory(c.id)} />
          ))}
        <div className={styles.tabSpacer} />
        <Tab
          icon={favorite?.icon ?? "coui://uil/Colored/StarFilledSmallIso.svg"}
          tooltip="Saved: your favourites and tags"
          selected={props.savedActive || current === FAVORITE_CATEGORY}
          onSelect={props.onSaved}
        />
      </div>
    </div>
  );
};

// Second row: subcategory tabs, as in the vanilla asset menu.
export const SubTabs = () => {
  const subCategories = useValue(B.SubCategoryList$);
  const current = useValue(B.CurrentSubCategory$);

  if (subCategories.length <= 1) {
    return null;
  }

  return (
    <div className={styles.subTabBar}>
      {subCategories.map((s) => (
        <Tab
          key={s.id}
          small
          icon={s.icon}
          tooltip={s.id === ANY ? "All" : s.toolTip}
          selected={current === s.id}
          onSelect={() => trigger(B.G, "SetCurrentSubCategory", s.id)}
        />
      ))}
    </div>
  );
};

// Where you are, in words: the selected category and subcategory, and how many assets match.
export const Location = (props: { savedTag: string | null }) => {
  const categories = useValue(B.CategoryList$);
  const subCategories = useValue(B.SubCategoryList$);
  const category = useValue(B.CurrentCategory$);
  const sub = useValue(B.CurrentSubCategory$);
  const count = useValue(B.PrefabCount$);

  const categoryName = props.savedTag ? "Saved" : categories.find((c) => c.id === category)?.toolTip ?? "";
  const subName = props.savedTag ? `#${props.savedTag}` : sub !== ANY ? subCategories.find((s) => s.id === sub)?.toolTip ?? "" : "";

  return (
    <div className={styles.location}>
      <div className={styles.locationTitle}>
        {categoryName}
        {subName && <span className={styles.locationSub}> · {subName}</span>}
      </div>
      <div className={styles.locationCount}>{count}</div>
    </div>
  );
};

// In Saved: favourites, then one entry per tag (yours first, then creators').
export const SavedRow = (props: { savedTag: string | null; onFavorites: () => void; onTag: (tag: string) => void }) => {
  const category = useValue(B.CurrentCategory$);
  const tagCounts = useValue(B.TagCounts$);
  const own = tagCounts.filter((t) => !t.creator);
  const creator = tagCounts.filter((t) => t.creator).slice(0, 24);

  const pill = (key: string, label: string, count: number | null, selected: boolean, onSelect: () => void, tooltip?: string) => (
    <Btn key={key} className={classNames(styles.pill, selected && styles.pillOn)} selected={selected} tooltip={tooltip} onSelect={onSelect}>
      <span>{label}</span>
      {count !== null && <span className={styles.pillCount}>{count}</span>}
    </Btn>
  );

  return (
    <div className={styles.pills}>
      {pill("fav", "Favourites", null, category === FAVORITE_CATEGORY && !props.savedTag, props.onFavorites)}
      {own.map((t) => pill(t.tag, `#${t.tag}`, t.count, props.savedTag === t.tag, () => props.onTag(t.tag)))}
      {own.length === 0 && <div className={styles.hint}>No tags yet. Hover an asset and use its tag button.</div>}
      {creator.map((t) => pill(`c${t.tag}`, `#${t.tag}`, t.count, props.savedTag === t.tag, () => props.onTag(t.tag), "Tag added by the asset's creator"))}
    </div>
  );
};
