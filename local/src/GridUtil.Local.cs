using System;

namespace FindIt.Utilities
{
	internal static partial class GridUtil
	{
		// The local UI measures its asset grid and reports the size (in UI units, 1/1080 of the
		// screen height) through the "SetGridSize" trigger. Columns and rows then follow the real
		// grid, whatever the dock's size, side or chrome. The same formulas live in
		// local/ui/src/grid.ts; keep them in step.
		private static float measuredWidth;
		private static float measuredHeight;

		internal const float TileGap = 6f;

		internal static bool SetMeasuredSize(float width, float height)
		{
			if (Math.Abs(width - measuredWidth) < 1f && Math.Abs(height - measuredHeight) < 1f)
			{
				return false;
			}

			measuredWidth = width;
			measuredHeight = height;

			return true;
		}

		private static float MinimumTileWidth() => _findItUISystem.ViewStyle switch
		{
			"GridWithText" => 100f,
			"GridNoText" => 76f,
			"GridSmall" => 52f,
			_ => 0f
		};

		private static bool TryGetMeasuredColumns(out float columns)
		{
			columns = 1;

			if (measuredWidth <= 0 || measuredHeight <= 0)
			{
				return false;
			}

			var minimum = MinimumTileWidth();

			if (minimum > 0)
			{
				columns = (float)Math.Max(1, Math.Floor((measuredWidth + TileGap) / (minimum + TileGap)));
			}

			return true;
		}

		private static bool TryGetMeasuredRows(out float rows)
		{
			rows = 1;

			if (measuredWidth <= 0 || measuredHeight <= 0)
			{
				return false;
			}

			TryGetMeasuredColumns(out var columns);

			var tileWidth = (measuredWidth - TileGap * (columns - 1)) / columns;
			var tileHeight = _findItUISystem.ViewStyle switch
			{
				"GridWithText" => tileWidth + 22f,
				"GridNoText" => tileWidth,
				"GridSmall" => tileWidth,
				_ => 28f
			};

			rows = (float)Math.Max(0.1, (measuredHeight + TileGap) / (tileHeight + TileGap));

			return true;
		}
	}
}
