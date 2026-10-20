namespace FindIt.Domain
{
	public partial class IndexedPrefabList
	{
		// Sort keys for PrefabSorting.LotSize: footprint first, then frontage.
		private static int LotArea(PrefabIndex prefabIndex)
		{
			return prefabIndex.LotSize.x * prefabIndex.LotSize.y;
		}

		private static int LotWidth(PrefabIndex prefabIndex)
		{
			return prefabIndex.LotSize.x;
		}
	}
}
