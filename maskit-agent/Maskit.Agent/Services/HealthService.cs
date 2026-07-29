using System;
using System.Net;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Maskit.Agent.Services;

public class HealthService
{
    private readonly int _port;
    private readonly string _version;
    private readonly RuleEngine _ruleEngine;
    private readonly PolicyEngine _policyEngine;
    private readonly DateTime _startTime;
    private HttpListener? _listener;
    private CancellationTokenSource? _cts;
    private Thread? _listenerThread;

    public HealthService(int port, string version, RuleEngine ruleEngine, PolicyEngine policyEngine)
    {
        _port = port;
        _version = version;
        _ruleEngine = ruleEngine;
        _policyEngine = policyEngine;
        _startTime = DateTime.UtcNow;
    }

    public void Start()
    {
        if (_listener != null) return;

        _listener = new HttpListener();
        // Bind strictly to 127.0.0.1 (loopback) on the specified port
        _listener.Prefixes.Add($"http://127.0.0.1:{_port}/");
        _listener.Start();

        _cts = new CancellationTokenSource();
        _listenerThread = new Thread(ListenLoop) { IsBackground = true };
        _listenerThread.Start();
    }

    public void Stop()
    {
        _cts?.Cancel();
        try
        {
            _listener?.Stop();
            _listener?.Close();
        }
        catch { /* ignore shutdown exceptions */ }
        _listener = null;
        _cts = null;
    }

    private void ListenLoop()
    {
        while (_listener != null && _listener.IsListening && _cts != null && !_cts.Token.IsCancellationRequested)
        {
            try
            {
                var context = _listener.GetContext();
                Task.Run(() => HandleRequest(context));
            }
            catch (Exception)
            {
                // Listener stopped or cancelled
            }
        }
    }

    private void HandleRequest(HttpListenerContext context)
    {
        var response = context.Response;
        try
        {
            var path = context.Request.Url?.AbsolutePath ?? "";
            if (context.Request.HttpMethod == "GET" && (path == "/health" || path == "/health/"))
            {
                var uptimeSecs = (int)(DateTime.UtcNow - _startTime).TotalSeconds;
                var healthData = new
                {
                    status = "active",
                    version = _version,
                    policyVersion = "default",
                    lastSync = _startTime.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    rulesLoaded = _ruleEngine.RuleCount,
                    uptime = uptimeSecs
                };

                var json = JsonSerializer.Serialize(healthData);
                byte[] buffer = System.Text.Encoding.UTF8.GetBytes(json);

                response.ContentType = "application/json";
                response.ContentLength64 = buffer.Length;
                response.StatusCode = (int)HttpStatusCode.OK;
                response.OutputStream.Write(buffer, 0, buffer.Length);
            }
            else
            {
                response.StatusCode = (int)HttpStatusCode.NotFound;
            }
        }
        catch
        {
            response.StatusCode = (int)HttpStatusCode.InternalServerError;
        }
        finally
        {
            try { response.OutputStream.Close(); } catch { /* ignore */ }
        }
    }
}
