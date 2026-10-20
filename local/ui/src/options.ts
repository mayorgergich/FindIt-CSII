// Helpers over the C# option sections (OptionsList binding). Every change goes through the
// mod's existing "OptionClicked" trigger, or the local "SetValueOption"/"SetLotSize" setters.
import { trigger } from "cs2/api";
import { OptionSection } from "upstream/domain/ContentViewType";
import { G, Section, Sign } from "bindings";

export const findSection = (list: OptionSection[], id: number) => list.find((s) => s.id === id);

export const clickOption = (sectionId: number, optionId: number, value = 0) =>
  trigger(G, "OptionClicked", sectionId, optionId, value);

// Value sections (lot width/depth, level) send their value as text: "All", "3", "10+".
export function sectionValue(section?: OptionSection): number {
  const text = section?.options?.[0]?.value ?? "";

  if (text.startsWith("10+")) {
    return 10;
  }

  const value = parseInt(text, 10);

  return isNaN(value) ? 0 : value;
}

export type MatchMode = "eq" | "min" | "max" | "not";

export const MATCH_MODES: MatchMode[] = ["eq", "min", "max", "not"];

export const MATCH_LABEL: Record<MatchMode, string> = {
  eq: "Exactly",
  min: "At least",
  max: "At most",
  not: "Not",
};

// What the player picked -> what C# stores (value + ValueSign). "At least 3" is "> 2".
export function toFilter(value: number, mode: MatchMode): [number, number] {
  if (!value) {
    return [0, Sign.Equal];
  }

  switch (mode) {
    case "min":
      return [value - 1, Sign.GreaterThan];
    case "max":
      return [value + 1, Sign.LessThan];
    case "not":
      return [value, Sign.NotEqual];
    default:
      return [value, Sign.Equal];
  }
}

// What C# stores -> what the player picked.
export function fromFilter(section?: OptionSection): { value: number; mode: MatchMode } {
  const value = sectionValue(section);

  if (!value || !section) {
    return { value: 0, mode: "eq" };
  }

  switch (section.valueSign) {
    case Sign.GreaterThan:
      return { value: value + 1, mode: "min" };
    case Sign.LessThan:
      return { value: value - 1, mode: "max" };
    case Sign.NotEqual:
      return { value, mode: "not" };
    default:
      return { value, mode: "eq" };
  }
}

const sizeText = (value: number) => (value ? (value >= 10 ? "10+" : String(value)) : "any");

const modePrefix = (mode: MatchMode) => (mode === "eq" ? "" : MATCH_LABEL[mode].toLowerCase() + " ");

export function lotLabel(list: OptionSection[]): string {
  const width = fromFilter(findSection(list, Section.LotWidth));
  const depth = fromFilter(findSection(list, Section.LotDepth));

  if (!width.value && !depth.value) {
    return "Any";
  }

  return `${modePrefix(width.value ? width.mode : depth.mode)}${sizeText(width.value)} × ${sizeText(depth.value)}`;
}

export function levelLabel(list: OptionSection[]): string {
  const level = fromFilter(findSection(list, Section.BuildingLevel));

  return level.value ? `${modePrefix(level.mode)}${level.value}`.trim() : "Any";
}

export const setLotSize = (width: number, depth: number, mode: MatchMode) => {
  const [w, sign] = toFilter(width, mode);
  const [d] = toFilter(depth, mode);

  trigger(G, "SetLotSize", w, d, sign);
};

export const setLevel = (value: number, mode: MatchMode) => {
  const [v, sign] = toFilter(value, mode);

  trigger(G, "SetValueOption", Section.BuildingLevel, v, sign);
};

// Density buttons: ZoneTypeFilter ids -> short labels (the full names stay as tooltips).
export const DENSITY_SHORT: Record<number, string> = { 0: "Any", 1: "Low", 2: "Row", 4: "Med", 8: "High", 16: "Sig" };

// Extra filters (ExtraFiltersOption.cs ids) -> short labels and plain descriptions.
export const EXTRA_LABEL: Record<number, [string, string]> = {
  0: ["Hide branding", "Signs, logos and brand props"],
  1: ["Hide random variants", "Assets that pick a look at random"],
  2: ["Only custom assets", "Hide the base game's assets"],
  3: ["Only placed in this city", "Assets with at least one copy on the map"],
  4: ["Unique meshes only", "Hide levels that reuse a mesh, like 2 and 4"],
  5: ["With parking", ""],
  6: ["Without parking", ""],
};

export const PARKING_IDS = [5, 6];

const selectedNames = (section: OptionSection) => section.options.filter((o, i) => i > 0 && o.selected).map((o) => o.name);

export interface ActiveChip {
  key: string;
  label: string;
  remove: () => void;
}

// Every filter that isn't at its default, as a removable chip.
export function activeChips(list: OptionSection[]): ActiveChip[] {
  const chips: ActiveChip[] = [];

  const zone = findSection(list, Section.ZoneType);
  const zoneSelected = zone?.options.find((o) => o.selected);
  if (zone && zoneSelected && zoneSelected.id !== zone.options[0]?.id) {
    chips.push({
      key: "zone",
      label: `${DENSITY_SHORT[zoneSelected.id] ?? zoneSelected.name} density`,
      remove: () => clickOption(Section.ZoneType, zone.options[0].id),
    });
  }

  if (findSection(list, Section.LotWidth) && lotLabel(list) !== "Any") {
    chips.push({ key: "lot", label: `Lot ${lotLabel(list)}`, remove: () => trigger(G, "SetLotSize", 0, 0, Sign.Equal) });
  }

  if (findSection(list, Section.BuildingLevel) && levelLabel(list) !== "Any") {
    chips.push({
      key: "level",
      label: `Level ${levelLabel(list)}`,
      remove: () => trigger(G, "SetValueOption", Section.BuildingLevel, 0, Sign.Equal),
    });
  }

  for (const id of [Section.Corner, Section.Theme, Section.Dlc]) {
    const section = findSection(list, id);

    if (!section || section.options.length === 0 || section.options[0].selected) {
      continue;
    }

    const names = selectedNames(section);

    if (names.length > 0) {
      chips.push({ key: `s${id}`, label: names.join(", "), remove: () => clickOption(id, section.options[0].id) });
    }
  }

  const pack = findSection(list, Section.Pack);
  if (pack && pack.options.length > 0 && !pack.options[0].selected) {
    const names = selectedNames(pack);
    chips.push({
      key: "pack",
      label: names.length === 1 ? names[0] : `${names.length} packs`,
      remove: () => clickOption(Section.Pack, pack.options[0].id),
    });
  }

  const extra = findSection(list, Section.Extra);
  extra?.options
    .filter((o) => o.selected)
    .forEach((o) =>
      chips.push({
        key: `x${o.id}`,
        label: EXTRA_LABEL[o.id]?.[0] ?? o.name,
        remove: () => clickOption(Section.Extra, o.id),
      }),
    );

  return chips;
}
