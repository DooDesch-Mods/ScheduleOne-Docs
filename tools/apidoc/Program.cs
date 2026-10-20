// Turns a mod's public API source into Starlight reference pages, WITHOUT compiling it.
//
// The mods reference IL2CPP interop and game assemblies that will never exist in a public CI runner, so anything
// that needs a built assembly (DocFX, XMLDoc2Markdown, XmlDocMarkdown) is out. Roslyn parses C# syntax with no
// references at all, which is the whole reason this approach works: the input is a .cs file and nothing else.
//
//   apidoc <input.cs|dir> <outdir> [--internal] [--history <first-seen.json>]
//   apidoc scan <manifest.json> <out.json>
//
// `scan` reads [{ "version": "1.2.0", "files": [...] }, ...] and answers with the API key set of each version.
// It exists so the caller can walk every release tag of a mod in ONE process instead of ninety: the answer to
// "which version added this member" is a diff across those key sets.
//
// Nothing here is best-effort. A doc comment that is not well-formed XML throws with its file and line rather than
// being dropped, because a silently missing summary is exactly the drift this tool exists to prevent.

using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

var jsonOut = new JsonSerializerOptions
{
    WriteIndented = true,
    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
};

if (args.Length >= 3 && args[0] == "scan") return Scan(args[1], args[2], jsonOut);

if (args.Length < 2)
{
    Console.Error.WriteLine("usage: apidoc <input.cs|dir> <outdir> [--internal] [--history <first-seen.json>]");
    Console.Error.WriteLine("       apidoc scan <manifest.json> <out.json>");
    return 2;
}

var input = args[0];
var outDir = args[1];
var includeInternal = args.Contains("--internal");

var historyPath = args.SkipWhile(a => a != "--history").Skip(1).FirstOrDefault();
var history = historyPath is null
    ? new Dictionary<string, string>()
    : JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(historyPath))
      ?? throw new InvalidOperationException($"{historyPath}: not a key -> version map");

var types = Parse(Expand(input), includeInternal);

if (types.Count == 0)
{
    Console.Error.WriteLine($"apidoc: no visible types found in {input}");
    return 1;
}

// Two types with the same simple name would share a page slug and a history key: one page would overwrite
// the other, and one type's first appearance would be dated from the other's. Both losses are silent, so
// this is a hard stop rather than a rename.
var collisions = types.GroupBy(t => Slug(t.Name)).Where(g => g.Count() > 1).ToList();
if (collisions.Count > 0)
{
    Console.Error.WriteLine("apidoc: two public types share a name, which would silently drop one:");
    foreach (var group in collisions)
        Console.Error.WriteLine($"  {string.Join(", ", group.Select(t => $"{t.Namespace}.{t.Name}"))}");
    return 1;
}

Directory.CreateDirectory(outDir);
// The type a reader opens first is the one with the most surface, not the one that sorts first alphabetically.
var ordered = types.OrderByDescending(t => t.Members.Count).ThenBy(t => t.Name).ToList();
var known = types.ToDictionary(t => t.Name);
for (var i = 0; i < ordered.Count; i++)
{
    var path = Path.Combine(outDir, Slug(ordered[i].Name) + ".md");
    File.WriteAllText(path, Markdown.Page(ordered[i], i + 1, history, new Refs(known, ordered[i])), new UTF8Encoding(false));
}

// The same "added in" the pages show, carried into the machine-readable surface: an agent asking whether a
// method exists usually also needs to know from which version, and it will not read the prose to find out.
// The JSON carries plain text: the cref markers resolve to their short names, without page links.
var plain = new Refs(known, null);
List<ApiParam> PlainParams(List<ApiParam> ps) => ps.Select(p => p with { Description = plain.Text(p.Description) }).ToList();
var stamped = types.Select(t => t with
{
    AddedIn = history.GetValueOrDefault(t.Key),
    Summary = plain.Text(t.Summary),
    Remarks = plain.Text(t.Remarks),
    Example = plain.Text(t.Example),
    Members = t.Members.Select(m => m with
    {
        AddedIn = history.GetValueOrDefault(m.Key),
        Summary = plain.Text(m.Summary),
        Returns = plain.Text(m.Returns),
        Value = plain.Text(m.Value),
        Remarks = plain.Text(m.Remarks),
        Example = plain.Text(m.Example),
        Parameters = PlainParams(m.Parameters),
    }).ToList(),
}).ToList();
File.WriteAllText(Path.Combine(outDir, "api.json"), JsonSerializer.Serialize(stamped, jsonOut), new UTF8Encoding(false));

var documented = types.Sum(t => t.Members.Count(m => m.Summary is not null) + (t.Summary is null ? 0 : 1));
var total = types.Sum(t => t.Members.Count + 1);
Console.WriteLine($"apidoc: {types.Count} types, {total - types.Count} members, {documented}/{total} documented ({100.0 * documented / total:F0}%)");
return 0;

// ---------------------------------------------------------------------------------------------------------------

/// One process for every release tag of a mod: ninety `dotnet run` starts cost more than the parsing does.
static int Scan(string manifestPath, string outPath, JsonSerializerOptions options)
{
    // The manifest is written by a JS caller, so its keys are camelCase.
    var manifest = JsonSerializer.Deserialize<List<ScanEntry>>(
        File.ReadAllText(manifestPath), new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
        ?? throw new InvalidOperationException($"{manifestPath}: not a list of {{ version, files }}");

    var result = new Dictionary<string, List<string>>();
    foreach (var entry in manifest)
    {
        if (string.IsNullOrEmpty(entry.Version) || entry.Files is null or { Count: 0 })
            throw new InvalidOperationException($"{manifestPath}: an entry has no version or no files");

        // A tag whose source no longer parses is a fact about that tag, not a reason to abandon the history.
        try
        {
            var types = Parse(entry.Files.ToArray(), includeInternal: false);
            result[entry.Version] = types
                .SelectMany(t => new[] { t.Key }.Concat(t.Members.Select(m => m.Key)))
                .Distinct().OrderBy(k => k, StringComparer.Ordinal).ToList();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"apidoc scan: {entry.Version} skipped - {ex.Message}");
        }
    }

    File.WriteAllText(outPath, JsonSerializer.Serialize(result, options), new UTF8Encoding(false));
    Console.WriteLine($"apidoc scan: {result.Count}/{manifest.Count} versions");
    return 0;
}

static string[] Expand(string input) => Directory.Exists(input)
    ? Directory.GetFiles(input, "*.cs", SearchOption.AllDirectories)
        .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}"))
        .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"))
        .ToArray()
    : new[] { input };

static List<ApiType> Parse(string[] files, bool includeInternal)
{
    var types = new List<ApiType>();
    foreach (var file in files) types.AddRange(Extract.FromFile(file, includeInternal));
    return MergePartials(types);
}

/// A partial type is one type spread over several files (Chassis: ChassisApi.cs, ChassisApi.Fit.cs, ...), so its
/// parts become one page. Only parts that are all declared partial merge: two unrelated types sharing a name still
/// reach the collision check and stop the run.
static List<ApiType> MergePartials(List<ApiType> types)
{
    var merged = new List<ApiType>();
    foreach (var group in types.GroupBy(t => (t.Namespace, t.Name)))
    {
        var parts = group.ToList();
        if (parts.Count == 1 || !parts.All(p => Regex.IsMatch(p.Signature, @"\bpartial\b")))
        {
            merged.AddRange(parts);
            continue;
        }
        // The summary lives on one part by convention; that part also gives the page its signature.
        var main = parts.FirstOrDefault(p => p.Summary is not null) ?? parts[0];
        merged.Add(main with
        {
            Remarks = parts.Select(p => p.Remarks).FirstOrDefault(r => r is not null),
            Example = parts.Select(p => p.Example).FirstOrDefault(r => r is not null),
            Members = parts.SelectMany(p => p.Members).ToList(),
        });
    }
    return merged;
}

static string Slug(string name) => Refs.PageSlug(name);

record ScanEntry(string Version, List<string> Files);

// ---------------------------------------------------------------------------------------------------------------

record ApiType(
    string Kind,
    string Name,
    string Namespace,
    string Signature,
    string? Summary,
    string? Remarks,
    List<ApiMember> Members)
{
    /// Identity across versions. Deliberately not the signature: a renamed parameter or a new default value
    /// is the same member, while a changed parameter type is a different one and should read as such.
    ///
    /// The simple name, not the qualified one, because this key is printed on every line of the changes page
    /// and `Snitch.Api.Profiler.Sample(string)` earns nothing there. Two types sharing a simple name would
    /// break that assumption, so extraction refuses them outright rather than dating one from the other.
    public string Key => Name;

    /// The release this first appeared in, when a history was supplied. Serialized so a consumer of api.json
    /// can answer "may I call this on the version I require" without reading a page.
    public string? AddedIn { get; init; }

    public string? Example { get; init; }
}

record ApiMember(
    string Kind,
    string Name,
    string Signature,
    string? Summary,
    string? Returns,
    List<ApiParam> Parameters,
    List<ApiParam> Exceptions,
    List<string> ParameterTypes)
{
    public string Owner { get; init; } = "";

    public string Key => ParameterTypes.Count > 0 || Kind is "method" or "constructor" or "operator" or "delegate"
        ? $"{Owner}.{Name}({string.Join(", ", ParameterTypes.Select(Markdown.ShortType))})"
        : $"{Owner}.{Name}";

    public string? AddedIn { get; init; }

    /// `<value>`: what a field or property holds - the allowed values, the unit, a sample.
    public string? Value { get; init; }

    public string? Remarks { get; init; }

    public string? Example { get; init; }
}

record ApiParam(string Name, string? Description);

static class Extract
{
    public static IEnumerable<ApiType> FromFile(string file, bool includeInternal)
    {
        var tree = CSharpSyntaxTree.ParseText(File.ReadAllText(file), path: file);

        // Roslyn recovers from a syntax error instead of throwing, and hands back whatever it managed to
        // parse. Accepting that would publish a partial API surface as if it were the whole one.
        var broken = tree.GetDiagnostics()
            .Where(d => d.Severity == DiagnosticSeverity.Error)
            .Take(3).ToList();
        if (broken.Count > 0)
        {
            throw new InvalidOperationException(
                $"{file}: does not parse as C#, so any surface read from it would be partial.\n  " +
                string.Join("\n  ", broken.Select(d => $"{d.Location.GetLineSpan().StartLinePosition.Line + 1}: {d.GetMessage()}")));
        }

        var root = tree.GetCompilationUnitRoot();

        foreach (var decl in root.DescendantNodes().OfType<BaseTypeDeclarationSyntax>())
        {
            if (!Visible(decl.Modifiers, defaultVisible: false, includeInternal)) continue;
            // A public member of a hidden type is not reachable, so hidden types take their nesting with them.
            if (decl.Ancestors().OfType<BaseTypeDeclarationSyntax>()
                    .Any(p => !Visible(p.Modifiers, false, includeInternal))) continue;

            var doc = Doc.Of(decl, file);
            yield return new ApiType(
                Kind: decl switch
                {
                    ClassDeclarationSyntax => "class",
                    StructDeclarationSyntax => "struct",
                    InterfaceDeclarationSyntax => "interface",
                    EnumDeclarationSyntax => "enum",
                    RecordDeclarationSyntax => "record",
                    _ => "type",
                },
                Name: decl.Identifier.Text,
                Namespace: NamespaceOf(decl),
                Signature: Sig.Type(decl),
                Summary: doc?.Block("summary"),
                Remarks: doc?.Block("remarks"),
                Members: Members(decl, file, includeInternal).ToList())
            {
                Example = doc?.Block("example"),
            };
        }
    }

    static IEnumerable<ApiMember> Members(BaseTypeDeclarationSyntax decl, string file, bool includeInternal)
    {
        var owner = decl.Identifier.Text;
        // Interface and enum members carry no accessibility of their own; everything declared there is reachable.
        var defaultVisible = decl is InterfaceDeclarationSyntax or EnumDeclarationSyntax;

        if (decl is EnumDeclarationSyntax e)
        {
            foreach (var m in e.Members)
            {
                var d = Doc.Of(m, file);
                yield return new ApiMember("field", m.Identifier.Text, Sig.EnumMember(m),
                    d?.Block("summary"), null, new(), new(), new())
                {
                    Owner = owner,
                    Remarks = d?.Block("remarks"),
                    Example = d?.Block("example"),
                };
            }
            yield break;
        }

        if (decl is not TypeDeclarationSyntax t) yield break;

        foreach (var m in t.Members)
        {
            if (m is BaseTypeDeclarationSyntax) continue; // nested types are emitted as their own page
            var mods = m switch
            {
                MemberDeclarationSyntax md => md.Modifiers,
                _ => default,
            };
            if (!Visible(mods, defaultVisible, includeInternal)) continue;

            var doc = Doc.Of(m, file);

            // A field or event declaration can declare several members at once. Each is its own entry; they
            // share the one doc comment the declaration carries.
            if (m is BaseFieldDeclarationSyntax field)
            {
                var fieldKind = field is EventFieldDeclarationSyntax ? "event" : "field";
                foreach (var v in field.Declaration.Variables)
                {
                    yield return new ApiMember(fieldKind, v.Identifier.Text, Sig.Field(field, v),
                        doc?.Block("summary"), null, new(), new(), new())
                    {
                        Owner = owner,
                        Value = doc?.Block("value"),
                        Remarks = doc?.Block("remarks"),
                        Example = doc?.Block("example"),
                    };
                }
                continue;
            }

            var (kind, name, sig) = m switch
            {
                MethodDeclarationSyntax x => ("method", x.Identifier.Text, Sig.Method(x)),
                PropertyDeclarationSyntax x => ("property", x.Identifier.Text, Sig.Property(x)),
                ConstructorDeclarationSyntax x => ("constructor", x.Identifier.Text, Sig.Constructor(x)),
                DelegateDeclarationSyntax x => ("delegate", x.Identifier.Text, Sig.Delegate(x)),
                OperatorDeclarationSyntax x => ("operator", x.OperatorToken.Text, Sig.Operator(x)),
                _ => ("", "", ""),
            };
            if (kind == "") continue;

            var paramList = m switch
            {
                MethodDeclarationSyntax x => x.ParameterList,
                ConstructorDeclarationSyntax x => x.ParameterList,
                DelegateDeclarationSyntax x => x.ParameterList,
                OperatorDeclarationSyntax x => x.ParameterList,
                _ => null,
            };

            yield return new ApiMember(kind, name, sig,
                doc?.Block("summary"),
                doc?.Block("returns"),
                doc?.Named("param") ?? new(),
                doc?.Named("exception", "cref") ?? new(),
                // `ref`/`out`/`in` are part of what a caller has to write, so two overloads that differ only
                // there are different members and must not collapse into one key.
                paramList?.Parameters.Select(p =>
                    string.Concat(
                        string.Join("", p.Modifiers
                            .Where(t => t.IsKind(SyntaxKind.RefKeyword) || t.IsKind(SyntaxKind.OutKeyword)
                                     || t.IsKind(SyntaxKind.InKeyword) || t.IsKind(SyntaxKind.ParamsKeyword))
                            .Select(t => t.Text + " ")),
                        p.Type?.ToString() ?? "?")).ToList() ?? new())
            {
                Owner = owner,
                Value = doc?.Block("value"),
                Remarks = doc?.Block("remarks"),
                Example = doc?.Block("example"),
            };
        }
    }

    static bool Visible(SyntaxTokenList mods, bool defaultVisible, bool includeInternal)
    {
        if (mods.Any(SyntaxKind.PublicKeyword)) return true;
        if (mods.Any(SyntaxKind.PrivateKeyword)) return false;
        if (mods.Any(SyntaxKind.ProtectedKeyword)) return true;
        if (mods.Any(SyntaxKind.InternalKeyword)) return includeInternal;
        return defaultVisible;
    }

    static string NamespaceOf(SyntaxNode node)
    {
        foreach (var a in node.Ancestors())
        {
            if (a is NamespaceDeclarationSyntax n) return n.Name.ToString();
            if (a is FileScopedNamespaceDeclarationSyntax f) return f.Name.ToString();
        }
        return "";
    }
}

// ---------------------------------------------------------------------------------------------------------------

/// Signatures are rendered from the syntax tree with bodies removed, so what a reader sees is what the source says.
static class Sig
{
    public static string Type(BaseTypeDeclarationSyntax d)
    {
        var head = d switch
        {
            TypeDeclarationSyntax t => $"{Mods(t.Modifiers)}{t.Keyword.Text} {t.Identifier}{t.TypeParameterList}",
            EnumDeclarationSyntax e => $"{Mods(e.Modifiers)}enum {e.Identifier}",
            _ => d.Identifier.Text,
        };
        var bases = d.BaseList is null ? "" : " : " + string.Join(", ", d.BaseList.Types.Select(b => b.ToString()));
        return Clean(head + bases);
    }

    public static string Method(MethodDeclarationSyntax m) => Compose(
        Mods(m.Modifiers) + m.ReturnType + " " + m.Identifier + m.TypeParameterList,
        m.ParameterList, Constraints(m.ConstraintClauses));

    public static string Constructor(ConstructorDeclarationSyntax c) =>
        Compose(Mods(c.Modifiers) + c.Identifier, c.ParameterList);

    public static string Operator(OperatorDeclarationSyntax o) => Compose(
        Mods(o.Modifiers) + o.ReturnType + " operator " + o.OperatorToken, o.ParameterList);

    public static string Delegate(DelegateDeclarationSyntax d) => Compose(
        Mods(d.Modifiers) + "delegate " + d.ReturnType + " " + d.Identifier + d.TypeParameterList,
        d.ParameterList);

    public static string Property(PropertyDeclarationSyntax p)
    {
        var accessors = p.AccessorList is null
            ? " { get; }" // expression-bodied
            : " { " + string.Join(" ", p.AccessorList.Accessors.Select(a =>
                (a.Modifiers.Count > 0 ? Mods(a.Modifiers) : "") + a.Keyword.Text + ";")) + " }";
        return Clean(Mods(p.Modifiers) + p.Type + " " + p.Identifier + accessors);
    }

    /// One declared variable at a time. `public float Intensity, Range, SpotAngle;` is three members, and
    /// rendering it as one entry named after the first drops the other two from the reference entirely.
    public static string Field(BaseFieldDeclarationSyntax f, VariableDeclaratorSyntax v)
    {
        // The initializer is the default a reader gets without setting the field, which is half of knowing what
        // goes in. A long one (a lambda, a nested object) would bury the name, so it is left out past a few words.
        var init = v.Initializer?.Value.ToString();
        var name = init is not null && Clean(init).Length <= 48 ? Clean(v.ToString()) : v.Identifier.Text;
        var evt = f is EventFieldDeclarationSyntax ? "event " : "";
        return Clean(Mods(f.Modifiers) + evt + f.Declaration.Type + " " + name);
    }

    public static string EnumMember(EnumMemberDeclarationSyntax m) =>
        Clean(m.Identifier + (m.EqualsValue is not null ? " " + m.EqualsValue : ""));

    /// A signature wider than this scrolls sideways in the rendered page, which on a reference page means the
    /// reader cannot see the thing they came for. Past it, one parameter per line.
    const int Width = 76;

    static string Compose(string head, ParameterListSyntax list, string tail = "")
    {
        var ps = list.Parameters.Select(p => Clean(p.WithAttributeLists(default).ToString())).ToList();
        var flat = Clean(head) + "(" + string.Join(", ", ps) + ")" + tail;
        if (ps.Count == 0 || flat.Length <= Width) return flat;
        return Clean(head) + "(\n    " + string.Join(",\n    ", ps) + ")" + tail;
    }

    static string Mods(SyntaxTokenList mods) =>
        mods.Count == 0 ? "" : string.Join(" ", mods.Select(m => m.Text)) + " ";

    static string Constraints(SyntaxList<TypeParameterConstraintClauseSyntax> cs) =>
        cs.Count == 0 ? "" : " " + string.Join(" ", cs.Select(c => c.ToString()));

    static string Clean(string s) => Regex.Replace(s, @"\s+", " ").Trim();
}

// ---------------------------------------------------------------------------------------------------------------

/// One member's `///` block, parsed as XML and rendered to Markdown.
sealed class Doc
{
    readonly XElement _root;
    Doc(XElement root) => _root = root;

    public static Doc? Of(SyntaxNode node, string file)
    {
        var trivia = node.GetLeadingTrivia()
            .Select(t => t.GetStructure())
            .OfType<DocumentationCommentTriviaSyntax>()
            .FirstOrDefault();
        if (trivia is null) return null;

        var lines = trivia.ToFullString()
            .Replace("\r\n", "\n").Split('\n')
            .Select(l => l.TrimStart())
            .Select(l => l.StartsWith("///") ? l[3..] : l)
            .Select(l => l.Length > 0 && l[0] == ' ' ? l[1..] : l);

        var xml = "<doc>\n" + string.Join("\n", lines) + "\n</doc>";
        try
        {
            return new Doc(XElement.Parse(xml, LoadOptions.PreserveWhitespace));
        }
        catch (Exception ex)
        {
            var line = node.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
            throw new InvalidOperationException(
                $"{file}:{line}: doc comment is not well-formed XML. Escape < and > as &lt; and &gt;.\n{ex.Message}");
        }
    }

    /// The rendered text of a single block element, e.g. summary or returns.
    public string? Block(string name)
    {
        var el = _root.Element(name);
        return el is null ? null : Render(el);
    }

    /// Repeated elements keyed by an attribute, e.g. every param or exception.
    public List<ApiParam> Named(string element, string attribute = "name") =>
        _root.Elements(element)
            .Select(e => new ApiParam(
                Strip(e.Attribute(attribute)?.Value ?? ""),
                Render(e) is { Length: > 0 } t ? t : null))
            .ToList();

    static string Render(XElement el)
    {
        var blocks = new List<string>();
        var para = new StringBuilder();

        void Flush()
        {
            var t = Regex.Replace(para.ToString(), @"[ \t]+", " ").Trim();
            if (t.Length > 0) blocks.Add(t);
            para.Clear();
        }

        void Walk(XElement parent)
        {
            foreach (var node in parent.Nodes())
            {
                switch (node)
                {
                    case XText text:
                        // A blank line in the source is a paragraph break; every other newline is just wrapping.
                        var parts = Regex.Split(text.Value.Replace("\r\n", "\n"), @"\n[ \t]*\n");
                        for (var i = 0; i < parts.Length; i++)
                        {
                            if (i > 0) Flush();
                            para.Append(Html(parts[i].Replace('\n', ' ')));
                        }
                        break;

                    case XElement e when e.Name == "code":
                        Flush();
                        blocks.Add("```csharp\n" + Dedent(e.Value) + "\n```");
                        break;

                    case XElement e when e.Name == "para":
                        Flush();
                        Walk(e);
                        Flush();
                        break;

                    case XElement e when e.Name == "c":
                        para.Append('`').Append(e.Value.Trim()).Append('`');
                        break;

                    case XElement e when e.Name == "see" || e.Name == "seealso":
                        // A cref keeps its full dotted name behind a marker; Refs shortens it and links it once
                        // every type of the mod is known.
                        if (e.Attribute("cref")?.Value is { } cref)
                            para.Append('`').Append(Refs.Cref).Append(Refs.Unprefix(cref)).Append('`');
                        else
                            para.Append('`').Append(e.Attribute("langword")?.Value ?? e.Value.Trim()).Append('`');
                        break;

                    case XElement e when e.Name == "paramref" || e.Name == "typeparamref":
                        para.Append('`').Append(e.Attribute("name")?.Value).Append('`');
                        break;

                    case XElement e when e.Name == "b" || e.Name == "strong":
                        para.Append("**").Append(e.Value.Trim()).Append("**");
                        break;

                    case XElement e when e.Name == "list":
                        Flush();
                        foreach (var item in e.Elements("item"))
                            blocks.Add("- " + Html(Regex.Replace(item.Value, @"\s+", " ").Trim()));
                        break;

                    case XElement e:
                        Walk(e);
                        break;
                }
            }
        }

        Walk(el);
        Flush();
        return string.Join("\n\n", blocks);
    }

    // Parsing the doc comment decodes an escaped "<code>" back to a bare tag, and in a Markdown page a bare
    // "<code>" opens an HTML element that swallows the rest of the page. Prose gets the entities back; code
    // spans and code blocks keep the raw characters, since Markdown shows those literally.
    static string Html(string text) => text.Replace("<", "&lt;").Replace(">", "&gt;");

    /// `T:Snitch.Api.Panel` and `Snitch.Api.Panel` both read better as `Panel`.
    static string Strip(string cref)
    {
        var s = cref.Length > 2 && cref[1] == ':' ? cref[2..] : cref;
        var paren = s.IndexOf('(');
        var head = paren < 0 ? s : s[..paren];
        var dot = head.LastIndexOf('.');
        return dot < 0 ? s : s[(dot + 1)..];
    }

    static string Dedent(string code)
    {
        var lines = code.Replace("\r\n", "\n").Split('\n').ToList();
        while (lines.Count > 0 && lines[0].Trim().Length == 0) lines.RemoveAt(0);
        while (lines.Count > 0 && lines[^1].Trim().Length == 0) lines.RemoveAt(lines.Count - 1);
        if (lines.Count == 0) return "";
        var indent = lines.Where(l => l.Trim().Length > 0)
            .Min(l => l.Length - l.TrimStart().Length);
        return string.Join("\n", lines.Select(l => l.Length >= indent ? l[indent..] : l.TrimStart()));
    }
}

// ---------------------------------------------------------------------------------------------------------------

static class Markdown
{
    public static string Page(ApiType type, int order, IReadOnlyDictionary<string, string> history, Refs refs)
    {
        var sb = new StringBuilder();
        var lead = FirstSentence(refs.Plain(type.Summary));

        // The oldest version in the history is where everything the mod started with lands. Stamping
        // "Added in 1.0.0" on all of it says nothing; the interesting mark is what arrived later.
        var first = history.Count == 0 ? null : history.Values.Distinct().OrderBy(Rank).First();
        string Added(string key) =>
            history.TryGetValue(key, out var v) && v != first ? $"Added in `{v}`\n\n" : "";

        sb.Append("---\n");
        sb.Append($"title: {type.Name}\n");
        if (lead is not null) sb.Append($"description: {Yaml(lead)}\n");
        sb.Append("sidebar:\n");
        sb.Append($"  order: {order}\n");
        sb.Append("---\n\n");

        sb.Append("```csharp\n").Append(type.Signature).Append("\n```\n\n");
        if (type.Namespace.Length > 0) sb.Append($"Namespace `{type.Namespace}`\n\n");
        sb.Append(refs.TypesLine(type.Signature, "Based on"));
        sb.Append(Added(type.Key));
        if (type.Summary is not null) sb.Append(refs.Text(type.Summary)).Append("\n\n");
        if (type.Remarks is not null) sb.Append(refs.Text(type.Remarks)).Append("\n\n");
        if (type.Example is not null) sb.Append("**Example**\n\n").Append(refs.Text(type.Example)).Append("\n\n");

        foreach (var group in type.Members.GroupBy(m => m.Kind).OrderBy(g => Order(g.Key)))
        {
            sb.Append("## ").Append(Heading(group.Key, group.Count())).Append("\n\n");
            foreach (var m in group)
            {
                sb.Append("### ").Append(MemberHeading(type, m)).Append("\n\n");
                sb.Append("```csharp\n").Append(m.Signature).Append("\n```\n\n");
                sb.Append(refs.TypesLine(m.Signature, m.Kind is "field" or "property" or "event" ? "Type" : "Types"));
                sb.Append(Added(m.Key));
                if (m.Summary is not null) sb.Append(refs.Text(m.Summary)).Append("\n\n");
                if (m.Value is not null) sb.Append("**Value** ").Append(refs.Text(m.Value)).Append("\n\n");
                if (m.Remarks is not null) sb.Append(refs.Text(m.Remarks)).Append("\n\n");

                if (m.Parameters.Count > 0)
                {
                    sb.Append("| Parameter | |\n|---|---|\n");
                    foreach (var p in m.Parameters)
                        sb.Append($"| `{p.Name}` | {Cell(refs.Text(p.Description))} |\n");
                    sb.Append('\n');
                }
                if (m.Returns is not null) sb.Append("**Returns** ").Append(Inline(refs.Text(m.Returns))).Append("\n\n");
                foreach (var x in m.Exceptions)
                    sb.Append($"**Throws** `{x.Name}` {Inline(refs.Text(x.Description))}\n\n");
                if (m.Example is not null) sb.Append("**Example**\n\n").Append(refs.Text(m.Example)).Append("\n\n");
            }
        }
        return sb.ToString().TrimEnd() + "\n";
    }

    /// Overloads share a name. Left alone they produce two identical headings and two identical anchors,
    /// so the table of contents offers the reader a choice between the same link twice.
    public static string MemberHeading(ApiType type, ApiMember m) =>
        type.Members.Count(o => o.Name == m.Name) > 1
            ? $"{m.Name}({string.Join(", ", m.ParameterTypes.Select(ShortType))})"
            : m.Name;

    /// Sorts 1.10.0 after 1.9.0, which a string comparison does not.
    public static (int, int, int) Rank(string version)
    {
        var parts = version.TrimStart('v').Split('-')[0].Split('.');
        int At(int i) => parts.Length > i && int.TryParse(parts[i], out var n) ? n : 0;
        return (At(0), At(1), At(2));
    }

    /// The heading only has to tell two overloads apart, so the namespace is noise: `Assembly`, not
    /// `System.Reflection.Assembly`. Generic arguments keep their own shortening.
    public static string ShortType(string type) =>
        Regex.Replace(type, @"[A-Za-z_][\w.]*", m => m.Value[(m.Value.LastIndexOf('.') + 1)..]);

    static int Order(string kind) => kind switch
    {
        "field" => 0, "property" => 1, "event" => 2, "constructor" => 3,
        "method" => 4, "operator" => 5, "delegate" => 6, _ => 9,
    };

    static string Heading(string kind, int n) => (kind, n) switch
    {
        ("property", _) => "Properties",
        ("field", _) => "Fields",
        ("event", _) => "Events",
        ("method", _) => "Methods",
        ("constructor", _) => "Constructors",
        ("operator", _) => "Operators",
        ("delegate", _) => "Delegates",
        _ => kind,
    };

    static string? FirstSentence(string? text)
    {
        if (text is null) return null;
        var first = text.Split("\n\n")[0].Trim();
        var dot = first.IndexOf(". ", StringComparison.Ordinal);
        var s = dot < 0 ? first : first[..(dot + 1)];
        return s.Length > 160 ? s[..157].TrimEnd() + "..." : s;
    }

    static string Yaml(string s) => "\"" + s.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";

    /// Table cells and inline slots cannot hold block content, so blocks collapse to one line.
    static string Cell(string? s) => s is null ? "" : Inline(s).Replace("|", "\\|");

    static string Inline(string? s) =>
        s is null ? "" : Regex.Replace(s.Replace("\n\n", " "), @"\s+", " ").Trim();
}

// ---------------------------------------------------------------------------------------------------------------

/// A reference page that names `SeatProfile` and gives no way to open it leaves the reader guessing what goes
/// in. Every code span that names a type or member of this mod becomes a link to its page and heading; names
/// from the game or another library stay plain, since there is no page to send the reader to.
sealed class Refs
{
    /// Marks a code span that came from a cref. A cref carries the full dotted name, which this class shortens
    /// to the part a reader needs; a <c> span is shown exactly as written.
    public const char Cref = '\u0001';

    readonly IReadOnlyDictionary<string, ApiType> _known;
    readonly ApiType? _page;

    /// `page` null renders plain text: the cref markers resolve, nothing becomes a link.
    public Refs(IReadOnlyDictionary<string, ApiType> known, ApiType? page)
    {
        _known = known;
        _page = page;
    }

    public static string PageSlug(string name) =>
        Regex.Replace(name, "[^A-Za-z0-9]+", "-").Trim('-').ToLowerInvariant();

    /// `M:Chassis.Api.ChassisApi.Register(Chassis.Api.ChassisProfile)` -> `Chassis.Api.ChassisApi.Register`.
    public static string Unprefix(string cref)
    {
        var s = cref.Length > 2 && cref[1] == ':' ? cref[2..] : cref;
        var paren = s.IndexOf('(');
        return paren < 0 ? s : s[..paren];
    }

    public string? Text(string? text)
    {
        if (text is null) return null;
        // Fenced blocks show code literally, so only the prose between them is touched. Split with a capture
        // group keeps the fences at the odd indices.
        var parts = Regex.Split(text, @"(```[\s\S]*?```)");
        for (var i = 0; i < parts.Length; i += 2)
            parts[i] = Regex.Replace(parts[i], "`([^`\n]+)`", m => Span(m.Groups[1].Value));
        return string.Concat(parts);
    }

    /// The same text without links, for places that take no Markdown link (the page description).
    public string? Plain(string? text) => new Refs(_known, null).Text(text);

    /// "Type: [`SeatProfile`](../seatprofile/)" under a signature that uses types of this mod.
    public string TypesLine(string signature, string label)
    {
        if (_page is null) return "";
        var hits = Regex.Matches(signature, @"\b[A-Za-z_]\w*\b").Select(m => m.Value)
            .Where(n => n != _page.Name && _known.ContainsKey(n))
            .Distinct().ToList();
        if (hits.Count == 0) return "";
        return label + ": " + string.Join(", ", hits.Select(n => Link(n, _known[n], null))) + "\n\n";
    }

    string Span(string s)
    {
        var cref = s.Length > 0 && s[0] == Cref;
        if (cref) s = s[1..];
        var segs = s.Split('.');

        var at = Array.FindLastIndex(segs, k => _known.ContainsKey(k));
        if (at >= 0)
        {
            var type = _known[segs[at]];
            var member = at + 1 < segs.Length ? type.Members.FirstOrDefault(m => m.Name == segs[at + 1]) : null;
            return Link(cref ? string.Join('.', segs[at..]) : s, type, member);
        }
        if (segs.Length == 1 && _page?.Members.FirstOrDefault(m => m.Name == s) is { } own)
            return Link(s, _page, own);

        // A cref into the game or the BCL: `T:Snitch.Api.Panel` reads better as `Panel`.
        return "`" + (cref ? segs[^1] : s) + "`";
    }

    string Link(string shown, ApiType type, ApiMember? member)
    {
        if (_page is null || (type == _page && member is null)) return "`" + shown + "`";
        var url = type == _page ? "" : $"../{PageSlug(type.Name)}/";
        var anchor = member is null ? "" : "#" + Anchor(Markdown.MemberHeading(type, member));
        return $"[`{shown}`]({url}{anchor})";
    }

    /// The heading id Starlight gives a heading (github-slugger): lower case, punctuation dropped, spaces to
    /// hyphens. `Register(ChassisProfile, bool)` -> `registerchassisprofile-bool`.
    static string Anchor(string heading) =>
        Regex.Replace(heading.ToLowerInvariant(), @"[^\p{L}\p{N}\s_-]", "").Replace(' ', '-');
}
