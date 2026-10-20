using Colossal.UI.Binding;

namespace FindIt.Domain.UIBinding
{
	public class TagCountUIEntry : IJsonWritable
	{
		public string Tag { get; set; }
		public int Count { get; set; }
		public bool IsCreatorTag { get; set; }

		public void Write(IJsonWriter writer)
		{
			writer.TypeBegin(GetType().FullName);

			writer.PropertyName("tag");
			writer.Write(Tag);

			writer.PropertyName("count");
			writer.Write(Count);

			writer.PropertyName("creator");
			writer.Write(IsCreatorTag);

			writer.TypeEnd();
		}
	}
}
