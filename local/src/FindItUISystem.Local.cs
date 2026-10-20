using FindIt.Domain.UIBinding;
using FindIt.Utilities;

using System.Collections.Generic;
using System.Linq;

namespace FindIt.Systems
{
	internal partial class FindItUISystem
	{
		private ValueBindingHelper<bool> _OfficialUiEnabled;
		private ValueBindingHelper<TagCountUIEntry[]> _TagCounts;
		private bool _localPanelWasShown;
		private string[] _lastSeenAllTags;

		// Called at the end of OnCreate (FindItUISystem.Setup.cs).
		private void CreateLocalBindings()
		{
			PrefabUIEntry.AssetNameResolver = prefab => _optionsUISystem.GetAssetName(prefab);

			_OfficialUiEnabled = CreateBinding("OfficialUiEnabled", false);
			_TagCounts = CreateBinding("TagCounts", new TagCountUIEntry[0]);

			CreateTrigger<float, float>("SetGridSize", SetGridSize);
			CreateTrigger<string, string>("TagMany", (ids, tag) => ChangeTagForMany(ParseIds(ids), tag, true));
			CreateTrigger<string, string>("UntagMany", (ids, tag) => ChangeTagForMany(ParseIds(ids), tag, false));
			CreateTrigger<string>("TagAllResults", tag => ChangeTagForMany(FindItUtil.GetFilteredPrefabs().Select(x => x.Id).ToList(), tag, true));
			CreateTrigger<string>("UntagAllResults", tag => ChangeTagForMany(FindItUtil.GetFilteredPrefabs().Select(x => x.Id).ToList(), tag, false));
			CreateTrigger("RefreshTagCounts", RefreshTagCounts);
		}

		// Called at the start of OnUpdate (FindItUISystem.Setup.cs).
		private void LocalOnUpdate()
		{
			var shown = _ShowFindItPanel.Value || _IsWindowLocked.Value;

			if (shown && !_localPanelWasShown)
			{
				_OfficialUiEnabled.Value = LocalBuild.IsOfficialUiEnabled();
				RefreshTagCounts();
			}

			// The tag editor refreshes AllTags after every single-asset change.
			if (shown && !ReferenceEquals(_AllTags.Value, _lastSeenAllTags))
			{
				_lastSeenAllTags = _AllTags.Value;
				RefreshTagCounts();
			}

			_localPanelWasShown = shown;
		}

		private void SetGridSize(float width, float height)
		{
			if (GridUtil.SetMeasuredSize(width, height))
			{
				RefreshPanelSize();
			}
		}

		private void RefreshTagCounts()
		{
			if (!FindItUtil.IsReady)
			{
				return;
			}

			_TagCounts.Value = FindItUtil.GetTagCounts()
				.Select(x => new TagCountUIEntry { Tag = x.Tag, Count = x.Count, IsCreatorTag = x.IsCreatorTag })
				.ToArray();
		}

		private void ChangeTagForMany(List<int> ids, string tag, bool add)
		{
			if (ids.Count == 0 || FindItUtil.ChangeTagForMany(ids, tag, add) == 0)
			{
				return;
			}

			_AllTags.Value = FindItUtil.GetAllTags();
			_lastSeenAllTags = _AllTags.Value;

			OnTagsChanged();
			RefreshTagCounts();
		}

		private static List<int> ParseIds(string ids)
		{
			var list = new List<int>();

			foreach (var part in (ids ?? string.Empty).Split(','))
			{
				if (int.TryParse(part, out var id))
				{
					list.Add(id);
				}
			}

			return list;
		}
	}
}
