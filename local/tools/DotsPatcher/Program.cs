// DotsPatcher: the "method cloner" step of Unity's Entities IL post-processor, for Linux builds.
//
// Unity's Entities source generators emit a rewritten copy of every method that uses SystemAPI,
// marked [DOTSCompilerPatchedMethod("<Name>_T<generic count>_<params>")]. In a Unity (or official
// CSII toolchain) build, an IL post-processor then moves each rewritten body into the original
// method and deletes the copy. Without that step the original bodies still call SystemAPI and
// throw at runtime. This tool performs the same swap; the logic is ported from
// com.unity.entities 1.3.10, Unity.Entities.CodeGen/Cloner (Cloner.cs, TypeDefinitionExtensions.cs).
//
// Usage: DotsPatcher <assembly.dll> <managed dir> [<extra search dir> ...]

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Colossal.Mono.Cecil;
using Colossal.Mono.Cecil.Cil;

internal static class Program
{
	private const string PatchedMethodAttribute = "DOTSCompilerPatchedMethodAttribute";
	private const string PatchedPropertyAttribute = "DOTSCompilerPatchedPropertyAttribute";

	private static int Main(string[] args)
	{
		if (args.Length < 2)
		{
			Console.Error.WriteLine("usage: DotsPatcher <assembly.dll> <managed dir> [<search dir> ...]");
			return 2;
		}

		var assemblyPath = Path.GetFullPath(args[0]);
		var resolver = new DefaultAssemblyResolver();
		foreach (var dir in args.Skip(1))
		{
			resolver.AddSearchDirectory(dir);
		}
		resolver.AddSearchDirectory(Path.GetDirectoryName(assemblyPath));

		var bytes = File.ReadAllBytes(assemblyPath);
		using var input = new MemoryStream(bytes);
		using var assembly = AssemblyDefinition.ReadAssembly(input, new ReaderParameters { AssemblyResolver = resolver, ReadingMode = ReadingMode.Immediate });

		var swapped = 0;
		foreach (var type in AllTypes(assembly.MainModule.Types).ToList())
		{
			swapped += PatchType(type);
		}

		var leftovers = AllTypes(assembly.MainModule.Types)
			.SelectMany(t => t.Methods)
			.Count(m => m.CustomAttributes.Any(a => a.AttributeType.Name == PatchedMethodAttribute));

		if (leftovers > 0)
		{
			Console.Error.WriteLine($"DotsPatcher: {leftovers} rewritten methods were left unpatched");
			return 1;
		}

		using var output = new MemoryStream();
		assembly.Write(output);
		File.WriteAllBytes(assemblyPath, output.ToArray());

		Console.WriteLine($"DotsPatcher: swapped {swapped} method bodies in {Path.GetFileName(assemblyPath)}");
		return 0;
	}

	private static IEnumerable<TypeDefinition> AllTypes(IEnumerable<TypeDefinition> types)
	{
		foreach (var type in types)
		{
			yield return type;

			foreach (var nested in AllTypes(type.NestedTypes))
			{
				yield return nested;
			}
		}
	}

	private static int PatchType(TypeDefinition typeDef)
	{
		var original = new List<MethodDefinition>();
		var rewritten = new List<(MethodDefinition Definition, string Source)>();

		foreach (var method in typeDef.Methods)
		{
			var attribute = method.CustomAttributes.FirstOrDefault(a => a.AttributeType.Name == PatchedMethodAttribute);

			if (attribute != null)
			{
				rewritten.Add((method, attribute.ConstructorArguments.First().Value.ToString()));
			}
			else
			{
				original.Add(method);
			}
		}

		var originalProperties = new Dictionary<string, PropertyDefinition>();
		var rewrittenProperties = new List<(PropertyDefinition Definition, string Source)>();

		foreach (var property in typeDef.Properties)
		{
			var attribute = property.CustomAttributes.FirstOrDefault(a => a.AttributeType.Name == PatchedPropertyAttribute);

			if (attribute != null)
			{
				rewrittenProperties.Add((property, attribute.ConstructorArguments.First().Value.ToString()));
			}
			else
			{
				originalProperties[$"{property.DeclaringType.ToString().Replace('/', '.')}.{property.Name}"] = property;
			}
		}

		if (rewritten.Count == 0 && rewrittenProperties.Count == 0)
		{
			return 0;
		}

		foreach (var (definition, source) in rewrittenProperties)
		{
			if (!originalProperties.TryGetValue(source, out var originalProperty))
			{
				throw new InvalidOperationException($"Cannot find property {source} in {typeDef.FullName}");
			}

			if (definition.GetMethod != null)
			{
				rewritten.Add((definition.GetMethod, MethodId(originalProperty.GetMethod)));
			}

			if (definition.SetMethod != null)
			{
				rewritten.Add((definition.SetMethod, MethodId(originalProperty.SetMethod)));
			}

			typeDef.Properties.Remove(definition);
		}

		var originalById = original.ToDictionary(MethodId, m => m);
		var count = 0;

		foreach (var (definition, source) in rewritten)
		{
			if (!originalById.TryGetValue(source, out var originalMethod))
			{
				throw new InvalidOperationException($"Cannot find method {source} in {typeDef.FullName}. Candidates: {string.Join(", ", originalById.Keys)}");
			}

			UpdateOriginalMethod(typeDef, originalMethod, definition);
			count++;
		}

		return count;
	}

	private static void UpdateOriginalMethod(TypeDefinition typeDef, MethodDefinition originalMethod, MethodDefinition rewrittenMethod)
	{
		// Drop closure classes and local functions only the original body used, as Unity does.
		var (displayClassesInOriginal, localFunctionsInOriginal) = GetDisplayClassAndLocalFunctionUsages(originalMethod, true);
		var (displayClassesInRewritten, _) = GetDisplayClassAndLocalFunctionUsages(rewrittenMethod, false);

		foreach (var displayClass in displayClassesInOriginal)
		{
			if (!displayClassesInRewritten.Contains(displayClass) && originalMethod.DeclaringType.NestedTypes.Contains(displayClass))
			{
				originalMethod.DeclaringType.NestedTypes.Remove(displayClass);

				for (var i = typeDef.Methods.Count - 1; i >= 0; i--)
				{
					if (typeDef.Methods[i].Parameters.FirstOrDefault()?.ParameterType.GetElementType() == displayClass)
					{
						typeDef.Methods.RemoveAt(i);
					}
				}
			}
		}

		foreach (var localFunction in localFunctionsInOriginal)
		{
			typeDef.Methods.Remove(localFunction);
		}

		originalMethod.Body = rewrittenMethod.Body;
		typeDef.Methods.Remove(rewrittenMethod);

		if (rewrittenMethod.HasGenericParameters && originalMethod.HasGenericParameters)
		{
			originalMethod.GenericParameters.Clear();

			foreach (var genericParameter in rewrittenMethod.GenericParameters)
			{
				originalMethod.GenericParameters.Add(genericParameter);
			}
		}
	}

	private static (HashSet<TypeDefinition>, HashSet<MethodDefinition>) GetDisplayClassAndLocalFunctionUsages(MethodDefinition method, bool alsoGetLocalFunctions)
	{
		var displayClasses = new HashSet<TypeDefinition>();
		var localFunctions = alsoGetLocalFunctions ? new HashSet<MethodDefinition>() : null;

		if (!method.HasBody)
		{
			return (displayClasses, localFunctions);
		}

		foreach (var local in method.Body.Variables.Where(l => IsDisplayClassCandidate(l.VariableType)))
		{
			displayClasses.Add(local.VariableType.Resolve());
		}

		foreach (var instruction in method.Body.Instructions)
		{
			var op = instruction.OpCode;

			if (op == OpCodes.Ldfld || op == OpCodes.Ldflda || op == OpCodes.Ldsfld || op == OpCodes.Ldsflda)
			{
				var field = (FieldReference)instruction.Operand;

				if (IsDisplayClassCandidate(field.FieldType))
				{
					displayClasses.Add(field.FieldType.Resolve());
				}
			}
			else if (op == OpCodes.Newobj)
			{
				var ctor = (MethodReference)instruction.Operand;

				if (IsDisplayClassCandidate(ctor.DeclaringType))
				{
					// Mirrors Unity's code, which records the declaring type here.
					displayClasses.Add(method.DeclaringType.Resolve());
				}
			}
			else if ((alsoGetLocalFunctions && op == OpCodes.Call) || op == OpCodes.Callvirt)
			{
				var callee = (MethodReference)instruction.Operand;

				if (callee.DeclaringType.FullName == method.DeclaringType.FullName)
				{
					var resolved = callee.Resolve();

					if (resolved != null && resolved.IsStatic && resolved.Name.Contains("g__"))
					{
						localFunctions?.Add(resolved);
					}
				}
			}
		}

		return (displayClasses, localFunctions);
	}

	private static bool IsDisplayClassCandidate(TypeReference type) => type.Name.StartsWith("<>c");

	private static string MethodId(MethodReference method)
	{
		var builder = new StringBuilder();
		builder.Append(method.Name);
		builder.Append($"_T{method.GenericParameters.Count}");

		foreach (var parameter in method.Parameters)
		{
			if (parameter.ParameterType.IsByReference)
			{
				builder.Append(parameter.IsIn ? "_in" : parameter.IsOut ? "_out" : "_ref");
			}

			builder.Append($"_{parameter.ParameterType}");
		}

		return builder.ToString();
	}
}
