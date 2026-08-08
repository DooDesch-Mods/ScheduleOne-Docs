// Turns a mod's public API source into Starlight reference pages, WITHOUT compiling it.
//
// The mods reference IL2CPP interop and game assemblies that will never exist in a public CI runner, so anything
// that needs a built assembly (DocFX, XMLDoc2Markdown, XmlDocMarkdown) is out. Roslyn parses C# syntax with no
// references at all, which is the whole reason this approach works: the input is a .cs file and nothing else.
//
//   apidoc <input.cs|dir> <outdir> [--internal]
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

if (args.Length < 2)
{
    Console.Error.WriteLine("usage: apidoc <input.cs|dir> <outdir> [--internal]");
    return 2;
}

var input = args[0];
var outDir = args[1];
var includeInternal = args.Contains("--internal");

var sources = Directory.Exists(input)
    ? Directory.GetFiles(input, "*.cs", SearchOption.AllDirectories)
        .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}"))
        .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"))
        .ToArray()
    : new[] { input };

var types = new List<ApiType>();
foreach (var file in sources)
    types.AddRange(Extract.FromFile(file, includeInternal));

if (types.Count == 0)
{
    Console.Error.WriteLine($"apidoc: no visible types found in {input}");
    return 1;
}

Directory.CreateDirectory(outDir);
// The type a reader opens first is the one with the most surface, not the one that sorts first alphabetically.
var ordered = types.OrderByDescending(t => t.Members.Count).ThenBy(t => t.Name).ToList();
for (var i = 0; i < ordered.Count; i++)
{
    var path = Path.Combine(outDir, Slug(ordered[i].Name) + ".md");
    File.WriteAllText(path, Markdown.Page(ordered[i], i + 1), new UTF8Encoding(false));
}

var json = JsonSerializer.Serialize(types, new JsonSerializerOptions
{
    WriteIndented = true,
    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
});
File.WriteAllText(Path.Combine(outDir, "api.json"), json, new UTF8Encoding(false));

var documented = types.Sum(t => t.Members.Count(m => m.Summary is not null) + (t.Summary is null ? 0 : 1));
var total = types.Sum(t => t.Members.Count + 1);
Console.WriteLine($"apidoc: {types.Count} types, {total - types.Count} members, {documented}/{total} documented ({100.0 * documented / total:F0}%)");
return 0;

static string Slug(string name) => Regex.Replace(name, "[^A-Za-z0-9]+", "-").Trim('-').ToLowerInvariant();

// ---------------------------------------------------------------------------------------------------------------

record ApiType(
    string Kind,
    string Name,
    string Namespace,
    string Signature,
    string? Summary,
    string? Remarks,
    List<ApiMember> Members);

record ApiMember(
    string Kind,
    string Name,
    string Signature,
    string? Summary,
    string? Returns,
    List<ApiParam> Parameters,
    List<ApiParam> Exceptions,
    List<string> ParameterTypes);

record ApiParam(string Name, string? Description);

static class Extract
{
    public static IEnumerable<ApiType> FromFile(string file, bool includeInternal)
    {
        var tree = CSharpSyntaxTree.ParseText(File.ReadAllText(file), path: file);
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
                Members: Members(decl, file, includeInternal).ToList());
        }
    }

    static IEnumerable<ApiMember> Members(BaseTypeDeclarationSyntax decl, string file, bool includeInternal)
    {
        // Interface and enum members carry no accessibility of their own; everything declared there is reachable.
        var defaultVisible = decl is InterfaceDeclarationSyntax or EnumDeclarationSyntax;

        if (decl is EnumDeclarationSyntax e)
        {
            foreach (var m in e.Members)
            {
                var d = Doc.Of(m, file);
                yield return new ApiMember("field", m.Identifier.Text, Sig.EnumMember(m),
                    d?.Block("summary"), null, new(), new(), new());
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
            var (kind, name, sig) = m switch
            {
                MethodDeclarationSyntax x => ("method", x.Identifier.Text, Sig.Method(x)),
                PropertyDeclarationSyntax x => ("property", x.Identifier.Text, Sig.Property(x)),
                EventFieldDeclarationSyntax x => ("event", x.Declaration.Variables[0].Identifier.Text, Sig.Field(x)),
                FieldDeclarationSyntax x => ("field", x.Declaration.Variables[0].Identifier.Text, Sig.Field(x)),
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
                paramList?.Parameters.Select(p => p.Type?.ToString() ?? "?").ToList() ?? new());
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

    public static string Field(BaseFieldDeclarationSyntax f)
    {
        var isConst = f.Modifiers.Any(SyntaxKind.ConstKeyword);
        var vars = string.Join(", ", f.Declaration.Variables.Select(v =>
            isConst && v.Initializer is not null ? v.ToString() : v.Identifier.Text));
        var evt = f is EventFieldDeclarationSyntax ? "event " : "";
        return Clean(Mods(f.Modifiers) + evt + f.Declaration.Type + " " + vars);
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
                            para.Append(parts[i].Replace('\n', ' '));
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
                        var target = e.Attribute("cref")?.Value ?? e.Attribute("langword")?.Value ?? e.Value;
                        para.Append('`').Append(Strip(target)).Append('`');
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
                            blocks.Add("- " + Regex.Replace(item.Value, @"\s+", " ").Trim());
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
    public static string Page(ApiType type, int order)
    {
        var sb = new StringBuilder();
        var lead = FirstSentence(type.Summary);

        sb.Append("---\n");
        sb.Append($"title: {type.Name}\n");
        if (lead is not null) sb.Append($"description: {Yaml(lead)}\n");
        sb.Append("sidebar:\n");
        sb.Append($"  order: {order}\n");
        sb.Append("---\n\n");

        sb.Append("```csharp\n").Append(type.Signature).Append("\n```\n\n");
        if (type.Namespace.Length > 0) sb.Append($"Namespace `{type.Namespace}`\n\n");
        if (type.Summary is not null) sb.Append(type.Summary).Append("\n\n");
        if (type.Remarks is not null) sb.Append(type.Remarks).Append("\n\n");

        // Overloads share a name. Left alone they produce two identical headings and two identical anchors,
        // so the table of contents offers the reader a choice between the same link twice.
        var overloaded = type.Members.GroupBy(m => m.Name).Where(g => g.Count() > 1)
            .Select(g => g.Key).ToHashSet();

        foreach (var group in type.Members.GroupBy(m => m.Kind).OrderBy(g => Order(g.Key)))
        {
            sb.Append("## ").Append(Heading(group.Key, group.Count())).Append("\n\n");
            foreach (var m in group)
            {
                var heading = overloaded.Contains(m.Name)
                    ? $"{m.Name}({string.Join(", ", m.ParameterTypes.Select(ShortType))})"
                    : m.Name;
                sb.Append("### ").Append(heading).Append("\n\n");
                sb.Append("```csharp\n").Append(m.Signature).Append("\n```\n\n");
                if (m.Summary is not null) sb.Append(m.Summary).Append("\n\n");

                if (m.Parameters.Count > 0)
                {
                    sb.Append("| Parameter | |\n|---|---|\n");
                    foreach (var p in m.Parameters)
                        sb.Append($"| `{p.Name}` | {Cell(p.Description)} |\n");
                    sb.Append('\n');
                }
                if (m.Returns is not null) sb.Append("**Returns** ").Append(Inline(m.Returns)).Append("\n\n");
                foreach (var x in m.Exceptions)
                    sb.Append($"**Throws** `{x.Name}` {Inline(x.Description)}\n\n");
            }
        }
        return sb.ToString().TrimEnd() + "\n";
    }

    /// The heading only has to tell two overloads apart, so the namespace is noise: `Assembly`, not
    /// `System.Reflection.Assembly`. Generic arguments keep their own shortening.
    static string ShortType(string type) =>
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
