import { trigger, useValue } from "cs2/api";
import { Tooltip } from "cs2/ui";
import classNames from "classnames";
import * as B from "bindings";
import { Btn } from "./controls";
import styles from "./dock.module.scss";

// Short rail labels by PrefabCategory id; the full localized names stay as tooltips.
const SHORT: Record<number, string> = {
  [-1]: "Any",
  100: "Buildings",
  200: "Services",
  300: "Networks",
  400: "Trees",
  500: "Props",
  600: "Vehicles",
};

export const FAVORITE_CATEGORY = 0;

type Props = {
  savedActive: boolean;
  onCategory: (id: number) => void;
  onSaved: () => void;
};

export const Rail = (props: Props) => {
  const categories = useValue(B.CategoryList$);
  const current = useValue(B.CurrentCategory$);
  const favorite = categories.find((c) => c.id === FAVORITE_CATEGORY);

  return (
    <div className={styles.rail}>
      {categories
        .filter((c) => c.id !== FAVORITE_CATEGORY)
        .map((c) => (
          <Tooltip key={c.id} tooltip={c.toolTip}>
            <Btn
              className={classNames(styles.railBtn, !props.savedActive && current === c.id && styles.on)}
              onSelect={() => props.onCategory(c.id)}
            >
              <img src={c.icon} className={styles.railIcon} />
              <div className={styles.railLabel}>{SHORT[c.id] ?? c.toolTip}</div>
            </Btn>
          </Tooltip>
        ))}
      <div className={styles.railSep} />
      <Btn
        className={classNames(styles.railBtn, (props.savedActive || current === FAVORITE_CATEGORY) && styles.on)}
        tooltip="Your favourites and tags"
        onSelect={props.onSaved}
      >
        <img src={favorite?.icon ?? "coui://uil/Colored/StarFilledSmallIso.svg"} className={styles.railIcon} />
        <div className={styles.railLabel}>Saved</div>
      </Btn>
    </div>
  );
};

export const selectCategory = (id: number) => trigger(B.G, "SetCurrentCategory", id);
