import { trigger, useValue } from "cs2/api";
import { Theme } from "cs2/bindings";
import { getModule } from "cs2/modding";
import { Scrollable } from "cs2/ui";
import { FOCUS_DISABLED } from "cs2/input";
import { useState } from "react";
import classNames from "classnames";
import { OptionSection } from "upstream/domain/ContentViewType";
import * as B from "bindings";
import { EXTRA_LABEL, PARKING_IDS, clickOption, findSection } from "options";
import { Btn, MaskIcon } from "./controls";
import styles from "./dock.module.scss";

const TextInput = getModule("game-ui/common/input/text/text-input.tsx", "TextInput");
const TextInputTheme: Theme | any = getModule("game-ui/editor/widgets/item/editor-item.module.scss", "classes");

const SIGN_TEXT: Record<number, [string, string]> = {
  4: ["=", "Exactly"],
  3: ["not", "Anything but"],
  2: ["more", "More than"],
  1: ["less", "Less than"],
};

// Everything that isn't in the building bar, with names instead of icon walls.
export const FilterDrawer = (props: { onClose: () => void }) => {
  const options = useValue(B.OptionsList$);
  const category = useValue(B.CurrentCategory$);
  const [packQuery, setPackQuery] = useState("");
  const extra = findSection(options, B.Section.Extra);
  const corner = findSection(options, B.Section.Corner);
  const theme = findSection(options, B.Section.Theme);
  const pack = findSection(options, B.Section.Pack);
  const dlc = findSection(options, B.Section.Dlc);
  const valueSections = [B.Section.LotWidth, B.Section.LotDepth, B.Section.BuildingLevel]
    .map((id) => findSection(options, id))
    .filter((s): s is OptionSection => !!s);
  const parking = extra?.options.filter((o) => PARKING_IDS.includes(o.id)) ?? [];
  const shows = extra?.options.filter((o) => !PARKING_IDS.includes(o.id)) ?? [];
  const buildings = category === 100 || category === 200;

  const segment = (section: OptionSection, labels?: Record<number, string>) => (
    <div className={styles.seg}>
      {section.options.map((o) => (
        <Btn key={o.id} className={classNames(styles.segBtn, o.selected && styles.on)} tooltip={o.name} onSelect={() => clickOption(section.id, o.id)}>
          {labels?.[o.id] ?? o.name}
        </Btn>
      ))}
    </div>
  );

  const query = packQuery.trim().toLowerCase();
  const packRows = pack ? pack.options.filter((o, i) => i === 0 || query === "" || o.name.toLowerCase().includes(query)) : [];

  return (
    <div className={styles.drawer}>
      <div className={styles.drawerHead}>
        <div className={styles.drawerTitle}>Filters</div>
        <Btn className={classNames(styles.btn, styles.iconBtn)} tooltip="Close" onSelect={props.onClose}>
          <MaskIcon src="coui://uil/Standard/XClose.svg" className={styles.btnIcon} />
        </Btn>
      </div>
      <Scrollable className={styles.drawerBody} vertical trackVisibility="scrollable">
        <div className={styles.drawerBodyInner}>
          {shows.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>Show</div>
              {shows.map((o) => (
                <Btn key={o.id} className={classNames(styles.switch, o.selected && styles.on)} onSelect={() => clickOption(B.Section.Extra, o.id)}>
                  <div className={styles.switchText}>
                    <div>{EXTRA_LABEL[o.id]?.[0] ?? o.name}</div>
                    {EXTRA_LABEL[o.id]?.[1] && <div className={styles.switchDesc}>{EXTRA_LABEL[o.id][1]}</div>}
                  </div>
                  <div className={styles.toggle}>
                    <div className={styles.toggleKnob} />
                  </div>
                </Btn>
              ))}
            </div>
          )}

          {(parking.length > 0 || corner || valueSections.length > 0) && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>Buildings</div>
              {parking.length > 0 && (
                <>
                  <div className={styles.fieldLabel}>Parking</div>
                  <div className={styles.seg}>
                    <Btn
                      className={classNames(styles.segBtn, !parking.some((o) => o.selected) && styles.on)}
                      onSelect={() => parking.filter((o) => o.selected).forEach((o) => clickOption(B.Section.Extra, o.id))}
                    >
                      Any
                    </Btn>
                    {parking.map((o) => (
                      <Btn key={o.id} className={classNames(styles.segBtn, o.selected && styles.on)} tooltip={o.name} onSelect={() => clickOption(B.Section.Extra, o.id)}>
                        {o.id === 5 ? "With" : "Without"}
                      </Btn>
                    ))}
                  </div>
                </>
              )}
              {corner && (
                <>
                  <div className={styles.fieldLabel}>Corner</div>
                  {segment(corner, { 7: "Any", 1: "Left", 2: "Front", 4: "Right" })}
                </>
              )}
              {valueSections.map((s) => {
                const value = s.options[0];
                return (
                  <div key={s.id} className={styles.stepper}>
                    <div className={styles.stepperName}>{s.name}</div>
                    <Btn className={styles.stepBtn} onSelect={() => clickOption(s.id, value.id, -1)}>
                      -
                    </Btn>
                    <div className={styles.stepValue}>{value.value}</div>
                    <Btn className={styles.stepBtn} onSelect={() => clickOption(s.id, value.id, 1)}>
                      +
                    </Btn>
                    <Btn
                      className={styles.signBtn}
                      tooltip={`${SIGN_TEXT[s.valueSign]?.[1] ?? "Exactly"} (click to change)`}
                      disabled={s.valueSign === 0}
                      onSelect={() => clickOption(s.id, value.id, 0)}
                    >
                      {SIGN_TEXT[s.valueSign]?.[0] ?? "="}
                    </Btn>
                  </div>
                );
              })}
            </div>
          )}

          {theme && !buildings && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>Theme</div>
              {theme.options.map((o) => (
                <Btn key={o.id} className={classNames(styles.listRow, o.selected && styles.on)} onSelect={() => clickOption(B.Section.Theme, o.id)}>
                  <div className={classNames(styles.check, styles.radio)} />
                  <img src={o.icon} className={styles.rowIcon} />
                  <div className={styles.rowName}>{o.name}</div>
                </Btn>
              ))}
            </div>
          )}

          {pack && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>Pack</div>
              <div className={styles.miniSearch}>
                <TextInput
                  multiline={1}
                  value={packQuery}
                  disabled={false}
                  type="text"
                  className={classNames(TextInputTheme.input, styles.miniInput)}
                  focusKey={FOCUS_DISABLED}
                  onChange={(e: Event) => setPackQuery((e?.target as HTMLTextAreaElement | null)?.value ?? "")}
                  placeholder="Find a pack"
                />
              </div>
              {packRows.map((o, i) => (
                <Btn key={o.id} className={classNames(styles.listRow, o.selected && styles.on)} onSelect={() => clickOption(B.Section.Pack, o.id)}>
                  <div className={styles.check} />
                  {i > 0 && <img src={o.icon} className={styles.rowIcon} />}
                  <div className={styles.rowName}>{i === 0 ? "All packs" : o.name}</div>
                </Btn>
              ))}
              <div className={styles.hint}>With all packs ticked, picking one shows only that pack. Pick more to add them.</div>
            </div>
          )}

          {dlc && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>DLC</div>
              {dlc.options.map((o, i) => (
                <Btn key={o.id} className={classNames(styles.listRow, o.selected && styles.on)} onSelect={() => clickOption(B.Section.Dlc, o.id)}>
                  <div className={classNames(styles.check, styles.radio)} />
                  {i > 0 && <img src={o.icon} className={styles.rowIcon} />}
                  <div className={styles.rowName}>{i === 0 ? "Any" : o.name}</div>
                </Btn>
              ))}
            </div>
          )}
        </div>
      </Scrollable>
      <div className={styles.drawerFoot}>
        <Btn className={styles.btn} onSelect={() => trigger(B.G, "ClearFilters")}>
          Clear all
        </Btn>
        <Btn className={classNames(styles.btn, styles.on)} onSelect={props.onClose}>
          Done
        </Btn>
      </div>
    </div>
  );
};
