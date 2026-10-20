using FindIt.Domain;

using System;
using System.Collections.Generic;
using System.Linq;

namespace FindIt.Utilities
{
	public static partial class FindItUtil
	{
		/// <summary>
		/// Adds or removes one tag on many assets, saving once. Same rules as AddTag/RemoveTag:
		/// creator tags can't be added again, and an existing tag's spelling is reused.
		/// </summary>
		public static int ChangeTagForMany(IEnumerable<int> ids, string tag, bool add)
		{
			tag = NormalizeTag(tag ?? string.Empty);

			if (tag.Length == 0)
			{
				return 0;
			}

			if (add)
			{
				tag = GetAllTags().FirstOrDefault(x => string.Equals(x, tag, StringComparison.OrdinalIgnoreCase)) ?? tag;
			}

			var changed = 0;

			foreach (var id in ids.Distinct())
			{
				if (GetPrefabIndex(id) is not PrefabIndex prefabIndex)
				{
					continue;
				}

				if (add)
				{
					if (prefabIndex.CreatorTags?.Contains(tag, StringComparer.OrdinalIgnoreCase) ?? false)
					{
						continue;
					}

					if (!customPrefabsData.TryGetValue(prefabIndex.PrefabName, out var data))
					{
						customPrefabsData[prefabIndex.PrefabName] = data = new CustomPrefabData();
					}

					data.Tags ??= new();

					if (data.Tags.Any(x => string.Equals(x, tag, StringComparison.OrdinalIgnoreCase)))
					{
						continue;
					}

					data.Tags.Add(tag);
					data.Tags.Sort(StringComparer.OrdinalIgnoreCase);
					prefabIndex.Tags = new List<string>(data.Tags);
				}
				else
				{
					if (!customPrefabsData.TryGetValue(prefabIndex.PrefabName, out var data)
						|| data.Tags is null
						|| data.Tags.RemoveAll(x => string.Equals(x, tag, StringComparison.OrdinalIgnoreCase)) == 0)
					{
						continue;
					}

					prefabIndex.Tags = new List<string>(data.Tags);
				}

				changed++;
			}

			if (changed > 0)
			{
				SaveCustomPrefabData();
			}

			return changed;
		}

		/// <summary>
		/// Every tag (yours and asset creators') with the number of assets that carry it, most used first.
		/// </summary>
		public static List<(string Tag, int Count, bool IsCreatorTag)> GetTagCounts()
		{
			var counts = new Dictionary<string, (string Tag, int Count, bool Creator)>(StringComparer.OrdinalIgnoreCase);

			foreach (var prefab in AllPrefabs.Values)
			{
				if (prefab.Tags is not null)
				{
					foreach (var tag in prefab.Tags)
					{
						counts[tag] = counts.TryGetValue(tag, out var entry) ? (entry.Tag, entry.Count + 1, entry.Creator) : (tag, 1, false);
					}
				}

				if (prefab.CreatorTags is not null)
				{
					foreach (var tag in prefab.CreatorTags)
					{
						counts[tag] = counts.TryGetValue(tag, out var entry) ? (entry.Tag, entry.Count + 1, entry.Creator) : (tag, 1, true);
					}
				}
			}

			return counts.Values
				.OrderBy(x => x.Creator)
				.ThenByDescending(x => x.Count)
				.ThenBy(x => x.Tag, StringComparer.OrdinalIgnoreCase)
				.Select(x => (x.Tag, x.Count, x.Creator))
				.ToList();
		}
	}
}
