using System;
using System.Runtime.InteropServices;
using System.Threading;

namespace Maskit.Agent.Services;

public sealed class ClipboardMonitor : IDisposable
{
    private readonly MaskitCoreService _core;
    private readonly AuditLogger _audit;
    private readonly ForegroundDetector _foreground;
    private const int WmClipboardUpdate = 0x031D;
    private const int WmQuit = 0x0012;
    private const uint CfUnicodeText = 13;
    private const uint GmemMoveable = 0x0002;
    private const uint GmemZeroInit = 0x0040;
    private static readonly IntPtr MessageWindow = new(-3);
    private IntPtr _hwnd;
    private Thread? _thread;
    private bool _running;
    private string? _lastText;
    private DateTime _lastProcessed = DateTime.MinValue; // FIXED: M2 — track the last clipboard processing time
    private static readonly TimeSpan MinInterval = TimeSpan.FromMilliseconds(200); // FIXED: M2 — cap clipboard processing frequency
    private GCHandle _callbackHandle;
    private WndProc? _callback;
    private readonly ManualResetEventSlim _ready = new(false);
    public bool IsMonitoring => _running;
    public event Action<string, int>? OnRedaction;

    public ClipboardMonitor(MaskitCoreService core, AuditLogger audit, ForegroundDetector foreground)
    { _core = core ?? throw new ArgumentNullException(nameof(core)); _audit = audit ?? throw new ArgumentNullException(nameof(audit)); _foreground = foreground ?? throw new ArgumentNullException(nameof(foreground)); }

    public void Start()
    {
        if (_running) return;
        _running = true;
        _thread = new Thread(MessageLoop) { IsBackground = true };
        _thread.Start();
        _ready.Wait(2000);
    }

    public void Stop()
    {
        if (!_running) return;
        _running = false;
        if (_hwnd != IntPtr.Zero) PostMessage(_hwnd, WmQuit, IntPtr.Zero, IntPtr.Zero);
        _thread?.Join(1500);
        _thread = null;
        Cleanup();
    }

    private void MessageLoop()
    {
        try
        {
            CreateWindow();
            _ready.Set();
            while (GetMessage(out var msg, _hwnd, 0, 0)) { if (msg.message == WmClipboardUpdate) TryProcessClipboard(); TranslateMessage(ref msg); DispatchMessage(ref msg); }
        }
        catch (Exception ex) { Console.Error.WriteLine($"Clipboard monitor stopped safely: {ex.Message}"); }
        finally { _ready.Set(); }
    }

    private void CreateWindow()
    {
        _callback = WindowProc;
        _callbackHandle = GCHandle.Alloc(_callback);
        var wc = new WndClass { cbSize = (uint)Marshal.SizeOf<WndClass>(), lpfnWndProc = Marshal.GetFunctionPointerForDelegate(_callback), hInstance = Marshal.GetHINSTANCE(typeof(ClipboardMonitor).Module), className = "MaskitClipboardMonitor" };
        RegisterClassEx(ref wc);
        _hwnd = CreateWindowEx(0, wc.className, "Maskit Clipboard Monitor", 0, 0, 0, 0, 0, MessageWindow, IntPtr.Zero, wc.hInstance, IntPtr.Zero);
        if (_hwnd != IntPtr.Zero && !AddClipboardFormatListener(_hwnd)) Console.Error.WriteLine("Clipboard listener registration failed");
    }

    private IntPtr WindowProc(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam) { if (msg == WmClipboardUpdate) TryProcessClipboard(); return DefWindowProc(hwnd, msg, wParam, lParam); }

    private void TryProcessClipboard()
    {
        var now = DateTime.UtcNow;
        if (now - _lastProcessed < MinInterval) return;
        _lastProcessed = now;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            if (OpenClipboard(IntPtr.Zero)) { try { ProcessOpenClipboard(); return; } finally { CloseClipboard(); } }
            Thread.Sleep(15 * (attempt + 1));
        }
    }

    private void ProcessOpenClipboard()
    {
        var data = GetClipboardData(CfUnicodeText);
        if (data == IntPtr.Zero) return;
        var ptr = GlobalLock(data);
        if (ptr == IntPtr.Zero) return;
        try
        {
            var text = Marshal.PtrToStringUni(ptr);
            if (string.IsNullOrEmpty(text) || text == _lastText) return;
            _lastText = text;
            var context = _foreground.GetForegroundContext();
            var result = _core.Scan(text, context, "windows-clipboard");
            if (result.Findings.Count == 0) return;
            foreach (var evt in result.AuditEvents)
            {
                _audit.LogEvent(new AuditEvent
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
            if (result.RedactedText == text) return;
            ReplaceClipboard(result.RedactedText);
            OnRedaction?.Invoke(context.ProcessName, result.Findings.Count);
        }
        finally { GlobalUnlock(data); }
    }

    private static void ReplaceClipboard(string text)
    {
        if (!OpenClipboard(IntPtr.Zero)) return;
        try
        {
            EmptyClipboard();
            var bytes = (nuint)((text.Length + 1) * 2);
            var handle = GlobalAlloc(GmemMoveable | GmemZeroInit, bytes);
            if (handle == IntPtr.Zero) return;
            var ptr = GlobalLock(handle);
            if (ptr == IntPtr.Zero) { GlobalFree(handle); return; }
            try { Marshal.Copy(text.ToCharArray(), 0, ptr, text.Length); Marshal.WriteInt16(ptr + text.Length * 2, 0); }
            finally { GlobalUnlock(handle); }
            if (SetClipboardData(CfUnicodeText, handle) == IntPtr.Zero) GlobalFree(handle);
        }
        finally { CloseClipboard(); }
    }

    private void Cleanup()
    { if (_hwnd != IntPtr.Zero) { RemoveClipboardFormatListener(_hwnd); DestroyWindow(_hwnd); _hwnd = IntPtr.Zero; } if (_callbackHandle.IsAllocated) _callbackHandle.Free(); _ready.Dispose(); }
    public void Dispose() { Stop(); }

    [StructLayout(LayoutKind.Sequential)] private struct WndClass { public uint cbSize, style; public IntPtr lpfnWndProc; public int cbClsExtra, cbWndExtra; public IntPtr hInstance, hIcon, hCursor, background; [MarshalAs(UnmanagedType.LPWStr)] public string? menuName; [MarshalAs(UnmanagedType.LPWStr)] public string? className; public IntPtr iconSm; }
    [StructLayout(LayoutKind.Sequential)] private struct Msg { public IntPtr hWnd; public uint message; public IntPtr wParam, lParam; public uint time; public Point point; }
    [StructLayout(LayoutKind.Sequential)] private struct Point { public int x; public int y; }
    private delegate IntPtr WndProc(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)] private static extern ushort RegisterClassEx(ref WndClass cls);
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)] private static extern IntPtr CreateWindowEx(uint ex, string? cls, string? name, uint style, int x, int y, int w, int h, IntPtr parent, IntPtr menu, IntPtr instance, IntPtr param);
    [DllImport("user32.dll")] private static extern bool DestroyWindow(IntPtr hwnd);
    [DllImport("user32.dll")] private static extern bool AddClipboardFormatListener(IntPtr hwnd);
    [DllImport("user32.dll")] private static extern bool RemoveClipboardFormatListener(IntPtr hwnd);
    [DllImport("user32.dll")] private static extern bool GetMessage(out Msg msg, IntPtr hwnd, uint min, uint max);
    [DllImport("user32.dll")] private static extern bool TranslateMessage(ref Msg msg);
    [DllImport("user32.dll")] private static extern IntPtr DispatchMessage(ref Msg msg);
    [DllImport("user32.dll")] private static extern IntPtr DefWindowProc(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] private static extern bool OpenClipboard(IntPtr owner);
    [DllImport("user32.dll")] private static extern bool CloseClipboard();
    [DllImport("user32.dll")] private static extern IntPtr GetClipboardData(uint format);
    [DllImport("user32.dll")] private static extern IntPtr SetClipboardData(uint format, IntPtr handle);
    [DllImport("user32.dll")] private static extern bool EmptyClipboard();
    [DllImport("kernel32.dll")] private static extern IntPtr GlobalLock(IntPtr handle);
    [DllImport("kernel32.dll")] private static extern bool GlobalUnlock(IntPtr handle);
    [DllImport("kernel32.dll")] private static extern IntPtr GlobalAlloc(uint flags, nuint bytes);
    [DllImport("kernel32.dll")] private static extern IntPtr GlobalFree(IntPtr handle);
}
