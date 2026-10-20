using Colossal.Core;
using Colossal.IO.AssetDatabase;

using Game.SceneFlow;

using System;
using System.Linq;

namespace FindIt
{
	/// <summary>
	/// Identity of the local Linux build (local/FindIt.Local.csproj). Never published.
	/// </summary>
	internal static class LocalBuild
	{
		/// <summary>
		/// UI binding group. The official copy uses "FindIt"; this one differs so the two never
		/// share bindings. Only one FindIt.dll is ever loaded: the game keeps the local copy over a
		/// Paradox Mods one (ExecutableAsset.GetUniqueVersionAsset).
		/// </summary>
		public const string BindingId = "FindItLocal";

		/// <summary>
		/// True when the official Find It (Paradox Mods id 77240) is enabled as well. Its UI module is
		/// named "FindIt"; this build's is "FindItLocal".
		/// </summary>
		public static bool IsOfficialUiEnabled()
		{
			try
			{
				return GameManager.instance.modManager.ListModsEnabled().Any(x => x == "FindIt");
			}
			catch
			{
				return false;
			}
		}

		/// <summary>
		/// When the official copy is also enabled, its C# never runs (this copy wins), but the game still
		/// loads its UI module, which then throws on its missing "FindIt.*" bindings and takes the whole
		/// in-game UI down. Once the mod manager has registered UI modules, remove that one.
		/// </summary>
		public static void RemoveOfficialUiModuleWhenReady()
		{
			MainThreadDispatcher.RegisterUpdater(() =>
			{
				var manager = GameManager.instance?.modManager;

				if (manager == null || !manager.isInitialized)
				{
					return false; // try again next frame
				}

				try
				{
					foreach (var asset in AssetDatabase.global.GetAssets<UIModuleAsset>().ToArray())
					{
						if (asset.isValidModule && asset.moduleInfo.m_ModuleId == "FindIt" && !asset.isLocal)
						{
							manager.RemoveUIModule(asset);
							Mod.Log.Info($"Removed the official Find It UI module ({asset.path}); its C# side isn't running, so it would break the game UI.");
						}
					}
				}
				catch (Exception ex)
				{
					Mod.Log.Error(ex, "Could not remove the official Find It UI module");
				}

				return true;
			});
		}
	}
}
