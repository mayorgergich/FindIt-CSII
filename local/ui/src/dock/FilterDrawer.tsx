import { trigger, useValue } from "cs2/api";
import { Button, InfoSectionFoldout, Scrollable } from "cs2/ui";
import { FOCUS_DISABLED } from "cs2/input";
import { ReactNode, useState } from "react";
import classNames from "classnames";
import { OptionSection } from "upstream/domain/ContentViewType";
import * as B from "bindings";
import { EXTRA_LABEL, PARKING_IDS, clickOption, findSection } from "options";
import { GLYPH, InputTheme, TextInput, ToolOptionsTheme, ToolSection } from "native";
import { CheckRow, HeaderIconBtn, ToolBtn } from "./controls";
import styles from "./dock.module.scss";

const SIGN_TEXT: Record<number, [string, string]> = {
  4: ["=", "Exactly"],
  3: ["not", "Anything but"],
  2: ["more", "More than"],
  1: ["less", "Less than"],
};

const Row = (props: { title: string; children: ReactNode }) =>
  ToolSection ? (
    <ToolSection title={props.title}>{props.children}</ToolSection>
  ) : (
    <div className={ToolOptionsTheme.item}>
      <div className={ToolOptionsTheme.label}>{props.title}</div>
      <div className={ToolOptionsTheme.content}>{props.children}</div>
    </div>
  );

// A collapsible group, as in the game's info panels.
const Group = (props: { title: string; open?: boolean; children: ReactNode }) => (
  <InfoSectionFoldout header={<div className={styles.groupTitle}>{props.title}</div>} initialExpanded={props.open ?? true} className={styles.group}>
    <div className={styles.groupBody}>{props.children}</div>
  </InfoSectionFoldout>
);

// Everything that isn't in the building bar, in the game's own controls, with names.
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
  const query = packQuery.trim().toLowerCase();
  const packRows = pack ? pack.options.filter((o, i) => i === 0 || query === "" || o.name.toLowerCase().includes(query)) : [];

  return (
    <div className={styles.drawer}>
      <div className={styles.drawerHead}>
        <div className={styles.drawerTitle}>Filters</div>
        <HeaderIconBtn src={GLYPH.close} className={styles.drawerClose} tooltip="Close filters" onSelect={props.onClose} />
      </div>
      <Scrollable className={styles.drawerBody} vertical trackVisibility="scrollable">
        {shows.length > 0 && (
          <Group title="Show">
            {shows.map((o) => (
              <CheckRow
                key={o.id}
                checked={o.selected}
                icon={o.icon}
                label={EXTRA_LABEL[o.id]?.[0] ?? o.name}
                description={EXTRA_LABEL[o.id]?.[1]}
                onChange={() => clickOption(B.Section.Extra, o.id)}
              />
            ))}
          </Group>
        )}

        {(parking.length > 0 || corner || valueSections.length > 0) && (
          <Group title="Buildings">
            {parking.length > 0 && (
              <Row title="Parking">
                <ToolBtn
                  src="coui://uil/Standard/StarAll.svg"
                  tooltip="Any"
                  selected={!parking.some((o) => o.selected)}
                  onSelect={() => parking.filter((o) => o.selected).forEach((o) => clickOption(B.Section.Extra, o.id))}
                />
                {parking.map((o) => (
                  <ToolBtn key={o.id} src={o.icon} tooltip={o.name} selected={o.selected} onSelect={() => clickOption(B.Section.Extra, o.id)} />
                ))}
              </Row>
            )}
            {corner && (
              <Row title="Corner">
                {corner.options.map((o) => (
                  <ToolBtn key={o.id} src={o.icon} tooltip={o.name} selected={o.selected} onSelect={() => clickOption(B.Section.Corner, o.id)} />
                ))}
              </Row>
            )}
            {valueSections.map((s) => {
              const value = s.options[0];
              return (
                <Row key={s.id} title={s.name}>
                  <ToolBtn src={GLYPH.down} tooltip="Lower" className={ToolOptionsTheme.startButton} onSelect={() => clickOption(s.id, value.id, -1)} />
                  <div className={classNames(ToolOptionsTheme.numberField, styles.numberField)}>{value.value}</div>
                  <ToolBtn src={GLYPH.up} tooltip="Higher" className={ToolOptionsTheme.endButton} onSelect={() => clickOption(s.id, value.id, 1)} />
                  <div className={styles.gapS} />
                  <ToolBtn
                    tooltip={`${SIGN_TEXT[s.valueSign]?.[1] ?? "Exactly"} (click to change)`}
                    disabled={s.valueSign === 0}
                    onSelect={() => clickOption(s.id, value.id, 0)}
                  >
                    <div className={styles.signText}>{SIGN_TEXT[s.valueSign]?.[0] ?? "="}</div>
                  </ToolBtn>
                </Row>
              );
            })}
          </Group>
        )}

        {theme && !buildings && (
          <Group title="Theme">
            {theme.options.map((o) => (
              <CheckRow key={o.id} radio checked={o.selected} icon={o.icon} label={o.name} onChange={() => clickOption(B.Section.Theme, o.id)} />
            ))}
          </Group>
        )}

        {pack && (
          <Group title="Pack" open={!pack.options[0]?.selected}>
            {TextInput && (
              <div className={styles.packSearch}>
                <TextInput
                  multiline={1}
                  value={packQuery}
                  disabled={false}
                  type="text"
                  className={classNames(InputTheme.input, styles.miniInput)}
                  focusKey={FOCUS_DISABLED}
                  onChange={(e: Event) => setPackQuery((e?.target as HTMLTextAreaElement | null)?.value ?? "")}
                  placeholder="Find a pack"
                />
              </div>
            )}
            {packRows.map((o, i) => (
              <CheckRow
                key={o.id}
                checked={o.selected}
                icon={i > 0 ? o.icon : undefined}
                label={i === 0 ? "All packs" : o.name}
                onChange={() => clickOption(B.Section.Pack, o.id)}
              />
            ))}
            <div className={styles.hint}>With all packs ticked, picking one shows only that pack. Pick more to add them.</div>
          </Group>
        )}

        {dlc && (
          <Group title="DLC" open={!dlc.options[0]?.selected}>
            {dlc.options.map((o, i) => (
              <CheckRow
                key={o.id}
                radio
                checked={o.selected}
                icon={i > 0 ? o.icon : undefined}
                label={i === 0 ? "Any" : o.name}
                onChange={() => clickOption(B.Section.Dlc, o.id)}
              />
            ))}
          </Group>
        )}
      </Scrollable>
      <div className={styles.drawerFoot}>
        <Button variant="flat" className={styles.footBtn} focusKey={FOCUS_DISABLED} onSelect={() => trigger(B.G, "ClearFilters")}>
          Clear all
        </Button>
        <Button variant="flat" className={classNames(styles.footBtn, styles.footBtnPrimary)} focusKey={FOCUS_DISABLED} onSelect={props.onClose}>
          Done
        </Button>
      </div>
    </div>
  );
};
