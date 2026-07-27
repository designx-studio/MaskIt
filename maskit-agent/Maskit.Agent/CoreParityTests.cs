using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using Maskit.Agent.Services;

namespace Maskit.Agent;

/// <summary>
/// Offline parity smoke tests for the Windows adapter. Uses the repository's
/// shared parity-fixtures.json and maskit-core rule/policy artifacts.
/// Run with: dotnet run -- --parity
/// </summary>
internal static class CoreParityTests
{
    public static int Run(string root)
    {
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
            var expected = fixture.Value.GetProperty("findings");
            var actual = core.Scan(input, new Services.AppContext { ProcessName = "chatgpt.com", AiDetected = true });
            var expectedValues = expected.EnumerateArray().Select(x => (x.GetProperty("type").GetString() ?? "", x.GetProperty("value").GetString() ?? "")).ToArray();
            var actualValues = actual.Findings.Select(x => (x.Type, x.Value)).ToArray();
            if (!expectedValues.SequenceEqual(actualValues))
            {
                Console.Error.WriteLine($"FAIL {category.Name}.{fixture.Name}: expected {expectedValues.Length}, got {actualValues.Length}");
                failures++;
            }
            else Console.WriteLine($"PASS {category.Name}.{fixture.Name}");
        }
        Console.WriteLine($"Windows parity: {failures} failed");
        return failures == 0 ? 0 : 1;
    }
}
