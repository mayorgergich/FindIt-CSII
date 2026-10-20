import { PrefabEntry } from "upstream/domain/prefabEntry";

// PrefabEntry plus the fields the local build adds (local/src/PrefabUIEntry.Local.cs).
export interface LocalPrefabEntry extends PrefabEntry {
  lotWidth: number;
  lotDepth: number;
  level: number;
  zone: string;
  hasParking: boolean;
  subCategoryName: string;
  themeName: string;
  packNames: string[];
  vanilla: boolean;
}

export interface TagCount {
  tag: string;
  count: number;
  creator: boolean;
}
