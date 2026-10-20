using FindIt.Domain.Enums;
using FindIt.Utilities;

using System;

namespace FindIt.Systems
{
	internal partial class FindItOptionsUISystem
	{
		// Called at the end of OnCreate (FindItOptionsUISystem.cs).
		// Lets the building bar set a value filter in one step instead of stepping and cycling signs.
		private void CreateLocalTriggers()
		{
			CreateTrigger<int, int, int>("SetValueOption", SetValueOption);
			CreateTrigger<int, int, int>("SetLotSize", SetLotSize);
		}

		// Section ids: 10 lot width, 11 lot depth, 12 building level. Sign is a ValueSign.
		private void SetValueOption(int sectionId, int value, int sign)
		{
			var valueSign = ToSign(sign);

			switch (sectionId)
			{
				case 10:
					FindItUtil.Filters.LotWidthFilter = Math.Max(0, Math.Min(10, value));
					FindItUtil.Filters.LotWidthSign = valueSign;
					break;
				case 11:
					FindItUtil.Filters.LotDepthFilter = Math.Max(0, Math.Min(10, value));
					FindItUtil.Filters.LotDepthSign = valueSign;
					break;
				case 12:
					FindItUtil.Filters.BuildingLevelFilter = Math.Max(0, Math.Min(5, value));
					FindItUtil.Filters.BuildingLevelSign = valueSign;
					break;
				default:
					return;
			}

			TriggerSearch();
			RefreshOptions();
		}

		private void SetLotSize(int width, int depth, int sign)
		{
			var valueSign = ToSign(sign);

			FindItUtil.Filters.LotWidthFilter = Math.Max(0, Math.Min(10, width));
			FindItUtil.Filters.LotWidthSign = valueSign;
			FindItUtil.Filters.LotDepthFilter = Math.Max(0, Math.Min(10, depth));
			FindItUtil.Filters.LotDepthSign = valueSign;

			TriggerSearch();
			RefreshOptions();
		}

		private static ValueSign ToSign(int sign)
		{
			return sign is >= (int)ValueSign.LessThan and <= (int)ValueSign.Equal ? (ValueSign)sign : ValueSign.Equal;
		}
	}
}
