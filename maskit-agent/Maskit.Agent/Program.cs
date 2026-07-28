using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using Maskit.Agent.Services;

namespace Maskit.Agent;

internal static class Program
{
    [STAThread]
    static int Main(string[] args)
    {
        if (args.Length >= 1 && string.Equals(args[0], "--parity", StringComparison.OrdinalIgnoreCase))
            return CoreParityTests.Run(System.AppContext.BaseDirectory);

        if (args.Length >= 1 && string.Equals(args[0], "--scan", StringComparison.OrdinalIgnoreCase))
            return HeadlessScan(args);

        if (args.Length >= 1 && string.Equals(args[0], "--self-test", StringComparison.OrdinalIgnoreCase))
            return SelfTest(System.AppContext.BaseDirectory);

        if (args.Length >= 1 && (string.Equals(args[0], "--help", StringComparison.OrdinalIgnoreCase) || args[0] == "-h"))
        {
            PrintUsage();
            return 0;
        }

        using var mutex = new Mutex(true, "MaskitAgentSingleInstance", out bool createdNew);
        if (!createdNew) return 0;
        var config = Config.Load();
        if (!Directory.Exists(config.RulesPath))
        {
            Console.Error.WriteLine($"Rules path not found: {config.RulesPath}");
            return 2;
        }
        var rules = new RuleEngine();
        rules.LoadRules(config.RulesPath);
        var policy = new PolicyEngine(config);
        var core = new MaskitCoreService(rules, policy);
        var audit = new AuditLogger(config.AuditLogPath);
        var foreground = new ForegroundDetector();
        using var clipboard = new ClipboardMonitor(core, audit, foreground);
        var tray = new TrayApplication(clipboard, policy, audit, config);
        System.Windows.Forms.Application.Run(tray);
        return 0;
    }

    /// <summary>
    /// Headless scan for clean-install / CI verification. Does not open a tray UI.
    /// Usage: Maskit.Agent.exe --scan "text" [--json] [--app name]
    /// </summary>
    private static int HeadlessScan(string[] args)
    {
        var text = args.Length >= 2 ? args[1] : "";
        var json = Array.Exists(args, a => string.Equals(a, "--json", StringComparison.OrdinalIgnoreCase));
        var app = "maskit-windows-agent";
        for (var i = 0; i < args.Length - 1; i++)
        {
            if (string.Equals(args[i], "--app", StringComparison.OrdinalIgnoreCase))
                app = args[i + 1];
        }
        if (string.IsNullOrWhiteSpace(text))
        {
            Console.Error.WriteLine("Usage: Maskit.Agent --scan \"text\" [--json] [--app name]");
            return 2;
        }

        var config = Config.Load();
        if (!Directory.Exists(config.RulesPath))
        {
            Console.Error.WriteLine($"Rules path not found: {config.RulesPath}");
            return 2;
        }
        var rules = new RuleEngine();
        rules.LoadRules(config.RulesPath);
        var policy = new PolicyEngine(config);
        var core = new MaskitCoreService(rules, policy);
        var result = core.Scan(text, new Services.AppContext { ProcessName = app, AiDetected = true }, "windows");

        // Persist canonical audit events to a temp log for verification (does not use clipboard)
        var verifyLog = Path.Combine(Path.GetTempPath(), "maskit-agent-selftest-audit.jsonl");
        try { if (File.Exists(verifyLog)) File.Delete(verifyLog); } catch { /* ignore */ }
        var audit = new AuditLogger(verifyLog);
        foreach (var evt in result.AuditEvents)
        {
            audit.LogEvent(new AuditEvent
            {
                SchemaVersion = evt.SchemaVersion,
                EventId = evt.EventId,
                Timestamp = evt.Timestamp,
                Source = evt.Source,
                Application = evt.Application,
                User = evt.User,
                Device = evt.Device,
                DataType = evt.DataType,
                Confidence = evt.Confidence,
                Risk = evt.Risk,
                Policy = evt.Policy,
                Action = evt.Action,
                Explanation = evt.Explanation,
                RuleId = evt.RuleId,
                MatchedValueHash = evt.MatchedValueHash
            });
        }

        var payload = new
        {
            findings = result.Findings.Select(f => new { type = f.Type, value = f.Value, severity = f.Severity, ruleName = f.Name }),
            redactedText = result.RedactedText,
            riskScore = result.RiskScore,
            riskLevel = result.RiskLevel,
            events = result.AuditEvents.Select(e => new
            {
                schemaVersion = e.SchemaVersion,
                eventId = e.EventId,
                timestamp = e.Timestamp,
                source = e.Source,
                application = e.Application,
                dataType = e.DataType,
                confidence = e.Confidence,
                risk = e.Risk,
                policy = new { name = e.Policy.Name, version = e.Policy.Version, result = e.Policy.Result },
                action = e.Action,
                explanation = e.Explanation,
                ruleId = e.RuleId,
                matchedValueHash = e.MatchedValueHash
            }),
            rulesPath = config.RulesPath,
            ruleCount = rules.RuleCount,
            auditLog = verifyLog
        };

        if (json)
            Console.WriteLine(JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true }));
        else
        {
            Console.WriteLine($"Rules: {rules.RuleCount} from {config.RulesPath}");
            Console.WriteLine($"Findings: {result.Findings.Count} risk={result.RiskScore}/{result.RiskLevel}");
            Console.WriteLine(result.RedactedText);
            foreach (var e in result.AuditEvents)
                Console.WriteLine($"  event {e.EventId} {e.DataType} {e.Action} hash={e.MatchedValueHash?[..12]}...");
        }

        // Exit 1 when findings exist (CLI parity)
        return result.Findings.Count > 0 ? 1 : 0;
    }

    private static int SelfTest(string baseDir)
    {
        var config = Config.Load(baseDir);
        if (!Directory.Exists(config.RulesPath))
        {
            Console.Error.WriteLine($"SELFTEST FAIL: rules path missing: {config.RulesPath}");
            return 1;
        }
        var rules = new RuleEngine();
        rules.LoadRules(config.RulesPath);
        if (rules.RuleCount < 5)
        {
            Console.Error.WriteLine($"SELFTEST FAIL: expected shared rules, got {rules.RuleCount}");
            return 1;
        }
        var policy = new PolicyEngine(config);
        var core = new MaskitCoreService(rules, policy);
        var result = core.Scan(
            "Contact test@example.com with key AKIAIOSFODNN7EXAMPLE",
            new Services.AppContext { ProcessName = "self-test", AiDetected = true },
            "windows");
        if (result.AuditEvents.Count == 0)
        {
            Console.Error.WriteLine("SELFTEST FAIL: no canonical events produced");
            return 1;
        }
        foreach (var e in result.AuditEvents)
        {
            if (e.SchemaVersion != "1.0" || string.IsNullOrEmpty(e.EventId) || string.IsNullOrEmpty(e.MatchedValueHash)
                || string.IsNullOrEmpty(e.Explanation) || e.Source != "windows")
            {
                Console.Error.WriteLine($"SELFTEST FAIL: invalid event {JsonSerializer.Serialize(e)}");
                return 1;
            }
        }
        Console.WriteLine($"SELFTEST PASS rules={rules.RuleCount} events={result.AuditEvents.Count}");
        return 0;
    }

    private static void PrintUsage()
    {
        Console.WriteLine("Maskit Windows Agent");
        Console.WriteLine("  (no args)           Start tray agent");
        Console.WriteLine("  --scan <text>       Headless scan; optional --json --app <name>");
        Console.WriteLine("  --self-test         Verify packaged rules + canonical events");
        Console.WriteLine("  --parity            Shared fixture parity against maskit-core");
        Console.WriteLine("  --help              Show this help");
    }
}
