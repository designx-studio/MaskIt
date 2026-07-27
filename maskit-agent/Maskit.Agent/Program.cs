using System;
using System.Threading;
using Maskit.Agent.Services;

namespace Maskit.Agent;

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
        var rules = new RuleEngine();
        rules.LoadRules(config.RulesPath);
        var policy = new PolicyEngine(config);
        var core = new MaskitCoreService(rules, policy);
        var audit = new AuditLogger(config.AuditLogPath);
        var foreground = new ForegroundDetector();
        using var clipboard = new ClipboardMonitor(core, audit, foreground);
        var tray = new TrayApplication(clipboard, policy, audit, config);
        tray.Run();
        return 0;
    }
}
