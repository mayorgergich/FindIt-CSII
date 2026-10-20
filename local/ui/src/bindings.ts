// Every C# binding the dock UI reads, in one place. Group = this module's id ("FindItLocal").
import { bindValue } from "cs2/api";
import mod from "mod.json";
import { PrefabCategory } from "upstream/domain/category";
import { PrefabSubCategory } from "upstream/domain/subCategory";
import { OptionSection } from "upstream/domain/ContentViewType";
import { LocalPrefabEntry, TagCount } from "types";

export const G = mod.id;

export const ShowFindItPanel$ = bindValue<boolean>(G, "ShowFindItPanel", false);
export const IsWindowLocked$ = bindValue<boolean>(G, "IsWindowLocked", false);
export const IsPrefabSelection$ = bindValue<boolean>(G, "IsPrefabSelection", false);
export const PrefabSelectionTitle$ = bindValue<string>(G, "PrefabSelectionTitle", "");
export const IsExpanded$ = bindValue<boolean>(G, "IsExpanded", false);
export const AlignmentStyle$ = bindValue<string>(G, "AlignmentStyle", "Left");
export const ViewStyle$ = bindValue<string>(G, "ViewStyle", "GridWithText");
export const NoAssetImage$ = bindValue<boolean>(G, "NoAssetImage", false);

export const RowSize$ = bindValue<number>(G, "RowSize", 40);
export const ColumnSize$ = bindValue<number>(G, "ColumnSize", 40);
export const ExpandedRowSize$ = bindValue<number>(G, "ExpandedRowSize", 80);
export const ExpandedColumnSize$ = bindValue<number>(G, "ExpandedColumnSize", 80);
export const RightRowSize$ = bindValue<number>(G, "RightRowSize", 80);
export const RightColumnSize$ = bindValue<number>(G, "RightColumnSize", 30);

export const CategoryList$ = bindValue<PrefabCategory[]>(G, "CategoryList", []);
export const SubCategoryList$ = bindValue<PrefabSubCategory[]>(G, "SubCategoryList", []);
export const CurrentCategory$ = bindValue<number>(G, "CurrentCategory", -1);
export const CurrentSubCategory$ = bindValue<number>(G, "CurrentSubCategory", -1);

export const CurrentSearch$ = bindValue<string>(G, "CurrentSearch", "");
export const IsSearchLoading$ = bindValue<boolean>(G, "IsSearchLoading", false);
export const ClearSearchBar$ = bindValue<boolean>(G, "ClearSearchBar", false);
export const FocusSearchBar$ = bindValue<boolean>(G, "FocusSearchBar", false);
export const PrefabCount$ = bindValue<string>(G, "PrefabCount", "");

export const PrefabList$ = bindValue<LocalPrefabEntry[]>(G, "PrefabList", []);
export const ActivePrefabId$ = bindValue<number>(G, "ActivePrefabId", 0);
export const SelectedPrefabIds$ = bindValue<number[]>(G, "SelectedPrefabIds", []);
export const ScrollIndex$ = bindValue<number>(G, "ScrollIndex", 0);
export const MaxScrollIndex$ = bindValue<number>(G, "MaxScrollIndex", 0);
export const RowCount$ = bindValue<number>(G, "RowCount", 1);
export const ColumnCount$ = bindValue<number>(G, "ColumnCount", 1);

export const OptionsList$ = bindValue<OptionSection[]>(G, "OptionsList", []);
export const AreFiltersSet$ = bindValue<boolean>(G, "AreFiltersSet", false);

export const TagEditorPrefabId$ = bindValue<number>(G, "TagEditorPrefabId", 0);
export const TagEditorPrefabName$ = bindValue<string>(G, "TagEditorPrefabName", "");
export const TagEditorTags$ = bindValue<string[]>(G, "TagEditorTags", []);
export const TagEditorCreatorTags$ = bindValue<string[]>(G, "TagEditorCreatorTags", []);
export const AllTags$ = bindValue<string[]>(G, "AllTags", []);

// Local build only (local/src).
export const TagCounts$ = bindValue<TagCount[]>(G, "TagCounts", []);
export const OfficialUiEnabled$ = bindValue<boolean>(G, "OfficialUiEnabled", false);

// Option section ids (C#: Domain/Options/*.cs).
export const Section = {
  Width: -6,
  Height: -5,
  Alignment: -4,
  ViewStyle: -3,
  Sorting: -2,
  SortOrder: -1,
  LotWidth: 10,
  LotDepth: 11,
  BuildingLevel: 12,
  Corner: 14,
  ZoneType: 15,
  Extra: 90,
  Pack: 94,
  Theme: 95,
  Dlc: 100,
} as const;

// ValueSign (C#: Domain/Enums/ValueSign.cs).
export const Sign = { None: 0, LessThan: 1, GreaterThan: 2, NotEqual: 3, Equal: 4 } as const;
