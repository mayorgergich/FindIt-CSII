using Colossal.UI.Binding;

using FindIt.Domain.Enums;
using FindIt.Utilities;

using Game.Prefabs;

using System;
using System.Collections.Generic;

namespace FindIt.Domain.UIBinding
{
	public partial class PrefabUIEntry
	{
		// Set by FindItUISystem: turns a prefab into its in-game display name.
		internal static Func<PrefabBase, string> AssetNameResolver;

		private static readonly Dictionary<PrefabBase, string> _nameCache = new();

		internal static void ClearNameCache()
		{
			_nameCache.Clear();
		}

		private static string GetName(PrefabBase prefab)
		{
			if (prefab is null)
			{
				return string.Empty;
			}

			if (!_nameCache.TryGetValue(prefab, out var name))
			{
				try
				{
					name = AssetNameResolver?.Invoke(prefab) ?? prefab.name;
				}
				catch
				{
					name = prefab.name;
				}

				_nameCache[prefab] = name;
			}

			return name;
		}

		// Extra details for the local UI's hover card.
		private void WriteLocal(IJsonWriter writer)
		{
			var index = _prefab as PrefabIndex;

			writer.PropertyName("lotWidth");
			writer.Write(index?.LotSize.x ?? 0);

			writer.PropertyName("lotDepth");
			writer.Write(index?.LotSize.y ?? 0);

			writer.PropertyName("level");
			writer.Write(index?.BuildingLevel ?? 0);

			writer.PropertyName("zone");
			writer.Write(index is null || index.ZoneType is ZoneTypeFilter.Any ? string.Empty : LocaleHelper.GetTooltip($"Zone{index.ZoneType}"));

			writer.PropertyName("hasParking");
			writer.Write(index?.HasParking ?? false);

			writer.PropertyName("subCategoryName");
			writer.Write(index is null || index.SubCategory is PrefabSubCategory.Any ? string.Empty : LocaleHelper.Translate($"Tooltip.LABEL[FindIt.{index.SubCategory}]"));

			writer.PropertyName("themeName");
			writer.Write(index?.Theme is { } theme ? GetName(theme) : string.Empty);

			var packs = index?.AssetPacks;
			writer.PropertyName("packNames");
			writer.ArrayBegin(packs?.Length ?? 0);
			for (var i = 0; i < (packs?.Length ?? 0); i++)
			{
				writer.Write(GetName(packs[i]));
			}

			writer.ArrayEnd();

			writer.PropertyName("vanilla");
			writer.Write(index?.IsVanilla ?? false);
		}
	}
}
