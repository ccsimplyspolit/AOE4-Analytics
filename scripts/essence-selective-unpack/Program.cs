using System.Text;
using System.Text.RegularExpressions;
using AOEMods.Essence.SGA.Graph;

if (args.Length < 3)
{
    Console.Error.WriteLine("Usage: essence-selective-unpack <input.sga> <output> <glob> [glob ...]");
    return 2;
}

var inputPath = Path.GetFullPath(args[0]);
var outputPath = Path.GetFullPath(args[1]);
var patterns = args.Skip(2).Select(Normalize).Where(value => value.Length > 0).ToArray();
if (!File.Exists(inputPath))
{
    Console.Error.WriteLine($"Input archive does not exist: {inputPath}");
    return 2;
}

var matchers = patterns.Select(pattern => new Regex(GlobToRegex(pattern), RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)).ToArray();
var matched = 0;
Directory.CreateDirectory(outputPath);

using var archiveFile = File.OpenRead(inputPath);
var archive = Archive.FromStream(archiveFile);
foreach (var node in ArchiveNodeHelper.EnumerateChildren(archive.Tocs[0].RootFolder).OfType<IArchiveFileNode>())
{
    var relative = Normalize(node.FullName);
    if (!matchers.Any(matcher => matcher.IsMatch(relative))) continue;

    var destination = Path.Combine(outputPath, relative.Replace('/', Path.DirectorySeparatorChar));
    var directory = Path.GetDirectoryName(destination);
    if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
    File.WriteAllBytes(destination, node.GetData().ToArray());
    matched++;
}

Console.WriteLine($"Selected {matched} archive files using {patterns.Length} glob patterns.");
return 0;

static string Normalize(string value) => value.Replace('\\', '/').TrimStart('/');

static string GlobToRegex(string glob)
{
    var builder = new StringBuilder("^");
    for (var index = 0; index < glob.Length; index++)
    {
        var current = glob[index];
        if (current == '*' && index + 1 < glob.Length && glob[index + 1] == '*')
        {
            index++;
            if (index + 1 < glob.Length && glob[index + 1] == '/')
            {
                index++;
                builder.Append("(?:.*/)?");
            }
            else
            {
                builder.Append(".*");
            }
        }
        else if (current == '*')
        {
            builder.Append("[^/]*");
        }
        else if (current == '?')
        {
            builder.Append("[^/]");
        }
        else
        {
            builder.Append(Regex.Escape(current.ToString()));
        }
    }
    builder.Append("$");
    return builder.ToString();
}
