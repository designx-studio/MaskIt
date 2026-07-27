using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using Maskit.Agent.Services;

namespace Maskit.Agent;

internal static class CoreParityTests
{
    public static int Run(string start)
    {
        var root = FindRoot(start);
        var config = Config.Load();
        var rules = new RuleEngine();
        rules.LoadRules(config.RulesPath);
        var policy = new PolicyEngine(config);
        var core = new MaskitCoreService(rules, policy);
        var fixturePath = Path.Combine(root, "parity-fixtures.json");
        if (!File.Exists(fixturePath)) throw new FileNotFoundException("Shared parity fixtures not found", fixturePath);

        using var document = JsonDocument.Parse(File.ReadAllText(fixturePath));
        var failures = 0;
        foreach (var category in document.RootElement.EnumerateObject())
        foreach (var fixture in category.Value.EnumerateObject())
        {
            var input = fixture.Value.GetProperty("input").GetString() ?? "";
            if (fixture.Value.TryGetProperty("rule", out var custom))
                rules.AddRuntimeRule(custom.GetProperty("id").GetString() ?? "custom", custom.GetProperty("pattern").GetString() ?? "");
            var expected = fixture.Value.GetProperty("findings");
            var actual = core.Scan(input, new Services.AppContext { ProcessName = "chatgpt.com", AiDetected = true });
            var expectedValues = expected.EnumerateArray().Select(x => (x.GetProperty("type").GetString() ?? "", x.GetProperty("value").GetString() ?? "")).ToArray();
            var actualValues = actual.Findings.Select(x => (x.Type, x.Value)).Where(x => expectedValues.Contains(x)).ToArray();
            if (!expectedValues.SequenceEqual(actualValues)) { Console.Error.WriteLine($"FAIL {category.Name}.{fixture.Name}"); failures++; }
            else Console.WriteLine($"PASS {category.Name}.{fixture.Name}");
        }
        Console.WriteLine($"Windows parity: {failures} failed");
        return failures == 0 ? 0 : 1;
    }

    private static string FindRoot(string start)
    {
        var directory = new DirectoryInfo(start);
        while (directory != null && !File.Exists(Path.Combine(directory.FullName, "parity-fixtures.json"))) directory = directory.Parent;
        return directory?.FullName ?? start;
    }
}
