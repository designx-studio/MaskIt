using System;
using System.Threading;
using Maskit.Agent.Services;

namespace Maskit.Agent;

/// <summary>Maskit Windows Agent: system-wide AI clipboard protection.</summary>
internal static class Program
{
    [STAThread]
    static int Main(string[] args)
    {
        if (args.Length == 1 && string.Equals(args[0], "--parity", StringComparison.OrdinalIgnoreCase))
            return CoreParityTests.Run(System.AppContext.BaseDirectory);

        using var mutex = new Mutex(true, "MaskitAgentSingleInstance", out bool createdNew);
        if (!createdNew) return 0;

        var config = Config.Load();
        var ruleEngine = new RuleEngine();
        ruleEngine.LoadRules(config.RulesPath);
        var policyEngine = new PolicyEngine(config);
        var auditLogger = new AuditLogger(config.AuditLogPath);
        var foregroundDetector = new ForegroundDetector();
        using var clipboardMonitor = new ClipboardMonitor(ruleEngine, policyEngine, auditLogger, foregroundDetector);
        var trayApp = new TrayApplication(clipboardMonitor, policyEngine, auditLogger, config);
        trayApp.Run();
        return 0;
    }
}
