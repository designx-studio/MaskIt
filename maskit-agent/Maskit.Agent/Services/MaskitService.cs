using System;
using System.ServiceProcess;

namespace Maskit.Agent.Services;

public class MaskitService : ServiceBase
{
    private readonly ClipboardMonitor _clipboard;
    private readonly HealthService _health;

    public MaskitService(ClipboardMonitor clipboard, HealthService health)
    {
        ServiceName = "MaskItAgent";
        _clipboard = clipboard;
        _health = health;

        CanStop = true;
        CanShutdown = true;
    }

    protected override void OnStart(string[] args)
    {
        _health.Start();
        _clipboard.Start();
    }

    protected override void OnStop()
    {
        try
        {
            _clipboard.Stop();
            _health.Stop();
        }
        catch
        {
            // Allow clean stop even if sub-service fails to stop
        }
    }

    protected override void OnShutdown()
    {
        OnStop();
    }
}
