import { trigger, useValue } from "cs2/api";
import * as B from "bindings";
import { activeChips } from "options";
import { GLYPH } from "native";
import { Btn, Glyph } from "./controls";
import styles from "./dock.module.scss";

// Every filter that isn't at its default, each removable, plus "Clear all".
export const ActiveFilters = () => {
  const options = useValue(B.OptionsList$);
  const chips = activeChips(options);

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className={styles.active}>
      {chips.map((c) => (
        <Btn key={c.key} className={styles.activeItem} tooltip="Remove this filter" onSelect={c.remove}>
          <span>{c.label}</span>
          <Glyph src={GLYPH.close} className={styles.activeX} />
        </Btn>
      ))}
      <Btn className={styles.linkBtn} onSelect={() => trigger(B.G, "ClearFilters")}>
        Clear all
      </Btn>
    </div>
  );
};
