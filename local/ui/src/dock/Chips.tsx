import { trigger, useValue } from "cs2/api";
import classNames from "classnames";
import * as B from "bindings";
import { activeChips } from "options";
import { Btn } from "./controls";
import { FAVORITE_CATEGORY } from "./Rail";
import styles from "./dock.module.scss";

const ANY_SUBCATEGORY = -1;

type SubProps = {
  saved: boolean;
  savedTag: string | null;
  onFavorites: () => void;
  onTag: (tag: string) => void;
};

// Subcategories as text chips, or (in Saved) favourites plus one chip per tag.
export const SubChips = (props: SubProps) => {
  const category = useValue(B.CurrentCategory$);
  const subCategories = useValue(B.SubCategoryList$);
  const current = useValue(B.CurrentSubCategory$);
  const tagCounts = useValue(B.TagCounts$);

  const subChips = subCategories.map((s) => (
    <Btn
      key={s.id}
      className={classNames(styles.chip, current === s.id && !props.savedTag && styles.on)}
      onSelect={() => trigger(B.G, "SetCurrentSubCategory", s.id)}
    >
      {s.id !== ANY_SUBCATEGORY && <img src={s.icon} className={styles.chipIcon} />}
      <div>{s.id === ANY_SUBCATEGORY ? "All" : s.toolTip}</div>
    </Btn>
  ));

  if (props.saved) {
    const own = tagCounts.filter((t) => !t.creator);
    const creator = tagCounts.filter((t) => t.creator);

    return (
      <>
        <div className={styles.chips}>
          <Btn
            className={classNames(styles.chip, category === FAVORITE_CATEGORY && !props.savedTag && styles.on)}
            onSelect={props.onFavorites}
          >
            <img src="coui://uil/Colored/StarFilledSmallIso.svg" className={styles.chipIcon} />
            <div>Favourites</div>
          </Btn>
          {own.map((t) => (
            <Btn
              key={t.tag}
              className={classNames(styles.chip, props.savedTag === t.tag && styles.on)}
              onSelect={() => props.onTag(t.tag)}
            >
              <div>#{t.tag}</div>
              <div className={styles.chipCount}>{t.count}</div>
            </Btn>
          ))}
          {own.length === 0 && <div className={styles.hint}>No tags yet. Hover an asset and click its tag button.</div>}
        </div>
        {creator.length > 0 && (
          <div className={styles.chips}>
            {creator.slice(0, 24).map((t) => (
              <Btn
                key={t.tag}
                className={classNames(styles.chip, props.savedTag === t.tag && styles.on)}
                tooltip="Tag added by the asset's creator"
                onSelect={() => props.onTag(t.tag)}
              >
                <div>#{t.tag}</div>
                <div className={styles.chipCount}>{t.count}</div>
              </Btn>
            ))}
          </div>
        )}
        {category === FAVORITE_CATEGORY && !props.savedTag && subCategories.length > 1 && <div className={styles.chips}>{subChips}</div>}
      </>
    );
  }

  if (subCategories.length <= 1) {
    return null;
  }

  return <div className={styles.chips}>{subChips}</div>;
};

// Every filter that isn't at its default, as a removable chip.
export const ActiveChips = () => {
  const options = useValue(B.OptionsList$);
  const chips = activeChips(options);

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className={styles.active}>
      {chips.map((c) => (
        <Btn key={c.key} className={styles.chip} tooltip="Remove this filter" onSelect={c.remove}>
          <div>{c.label}</div>
          <div className={styles.chipX}>×</div>
        </Btn>
      ))}
      <Btn className={styles.linkBtn} onSelect={() => trigger(B.G, "ClearFilters")}>
        Clear all
      </Btn>
    </div>
  );
};
