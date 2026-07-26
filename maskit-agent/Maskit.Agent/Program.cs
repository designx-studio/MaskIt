using System;
using System.Threading;
using Maskit.Agent.Services;

namespace Maskit.Agent;

/// <summary>
/// Maskit Windows Agent — System-wide AI clipboard protection.
/// Runs in user session with system tray icon.
/// </summary>
internal static class Program
{
    [STAThread]
    static void Main()
    {
        using var mutex = new Mutex(true, "MaskitAgentSingleInstance", out bool createdNew);
        if (!createdNew)
        {
            // Another instance already running
            return;
        }

        var config = Config.Load();
        var ruleEngine = new RuleEngine();
        ruleEngine.LoadRules(config.RulesPath);

        var policyEngine = new PolicyEngine(config);
        var auditLogger = new AuditLogger(config.AuditLogPath);
        var foregroundDetector = new ForegroundDetector();
        var clipboardMonitor = new ClipboardMonitor(ruleEngine, policyEngine, auditLogger, foregroundDetector);

        var trayApp = new TrayApplication(clipboardMonitor, policyEngine, auditLogger, config);
        trayApp.Run();
    }
}