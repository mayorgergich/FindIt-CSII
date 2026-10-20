using Game.SceneFlow;

using System.Linq;

namespace FindIt
{
	/// <summary>
	/// Identity of the local Linux build (local/FindIt.Local.csproj). Never published.
	/// </summary>
	internal static class LocalBuild
	{
		/// <summary>
		/// UI binding group. The official copy uses "FindIt"; this one differs so that the official
		/// UI module, if it is ever enabled next to this copy, finds no bindings and stays inert.
		/// Only one FindIt.dll is ever loaded: the game keeps the local copy over a Paradox Mods one.
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
	}
}
