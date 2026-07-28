using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using Maskit.Agent.Services;

namespace Maskit.Agent;

/// <summary>
/// Shared fixture parity against parity-fixtures.json using packaged or repo maskit-core rules.
/// </summary>
internal static class CoreParityTests
{
    public static int Run(string start)
    {
        var root = FindRoot(start);
        var config = Config.Load(start);
        if (!Directory.Exists(config.RulesPath))
        {
            Console.Error.WriteLine($"Rules path not found: {config.RulesPath}");
            return 1;
        }
        var rules = new RuleEngine();
        rules.LoadRules(config.RulesPath);
        var policy = new PolicyEngine(config);
        var core = new MaskitCoreService(rules, policy);
        var fixturePath = Path.Combine(root, "parity-fixtures.json");
        if (!File.Exists(fixturePath))
        {
            // Packaged release may ship fixtures next to the binary
            var packaged = Path.Combine(start, "parity-fixtures.json");
            fixturePath = File.Exists(packaged) ? packaged : fixturePath;
        }
        if (!File.Exists(fixturePath))
            throw new FileNotFoundException("Shared parity fixtures not found", fixturePath);

        using var document = JsonDocument.Parse(File.ReadAllText(fixturePath));
        var failures = 0;
        foreach (var category in document.RootElement.EnumerateObject())
        foreach (var fixture in category.Value.EnumerateObject())
        {
            var input = fixture.Value.GetProperty("input").GetString() ?? "";
            // Fresh rule engine per fixture when custom rules are involved
            var localRules = rules;
            if (fixture.Value.TryGetProperty("rule", out var custom))
            {
                localRules = new RuleEngine();
                localRules.LoadRules(config.RulesPath);
                localRules.AddRuntimeRule(
                    custom.GetProperty("id").GetString() ?? "custom",
                    custom.GetProperty("pattern").GetString() ?? "");
            }
            var localCore = localRules == rules ? core : new MaskitCoreService(localRules, policy);
            // Use default policy context (not chatgpt.com overrides) so shared fixtures match Node defaults
            var actual = localCore.Scan(input, new Services.AppContext { ProcessName = "parity", AiDetected = true }, "windows");
            var expected = fixture.Value.GetProperty("findings").EnumerateArray()
                .Select(x => (x.GetProperty("type").GetString() ?? "", x.GetProperty("value").GetString() ?? ""))
                .ToArray();
            var found = actual.Findings.Select(x => (x.Type, x.Value)).ToArray();
            var expectedActions = fixture.Value.GetProperty("actions").EnumerateArray().Select(x => x.GetString() ?? "").ToArray();
            var actualActions = actual.Decisions.Select(x => x.Action).ToArray();
            var eventsOk = actual.AuditEvents.Count == expected.Length
                && actual.AuditEvents.All(e =>
                    e.SchemaVersion == "1.0"
                    && !string.IsNullOrEmpty(e.EventId)
                    && e.Source == "windows"
                    && !string.IsNullOrEmpty(e.DataType)
                    && e.Confidence is >= 0 and <= 1
                    && !string.IsNullOrEmpty(e.Action)
                    && !string.IsNullOrEmpty(e.Explanation)
                    && !string.IsNullOrEmpty(e.MatchedValueHash)
                    && e.MatchedValueHash.Length == 64);

            var ok = expected.SequenceEqual(found)
                && actual.RiskScore == fixture.Value.GetProperty("riskScore").GetInt32()
                && actual.RiskLevel == fixture.Value.GetProperty("riskLevel").GetString()
                && expectedActions.SequenceEqual(actualActions)
                && eventsOk;

            if (!ok)
            {
                Console.Error.WriteLine($"FAIL {category.Name}.{fixture.Name}");
                Console.Error.WriteLine($"  expected findings: {string.Join(",", expected.Select(e => e.Item1))}");
                Console.Error.WriteLine($"  actual findings:   {string.Join(",", found.Select(e => e.Type))}");
                Console.Error.WriteLine($"  expected actions:  {string.Join(",", expectedActions)}");
                Console.Error.WriteLine($"  actual actions:    {string.Join(",", actualActions)}");
                Console.Error.WriteLine($"  risk {actual.RiskScore}/{actual.RiskLevel} eventsOk={eventsOk}");
                failures++;
            }
            else Console.WriteLine($"PASS {category.Name}.{fixture.Name}");
        }
        Console.WriteLine($"Windows parity: {failures} failed");
        return failures == 0 ? 0 : 1;
    }

    private static string FindRoot(string start)
    {
        var directory = new DirectoryInfo(start);
        while (directory != null && !File.Exists(Path.Combine(directory.FullName, "parity-fixtures.json")))
            directory = directory.Parent;
        return directory?.FullName ?? start;
    }
}
