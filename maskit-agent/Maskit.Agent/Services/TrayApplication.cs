using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace Maskit.Agent.Services;

public class TrayApplication : ApplicationContext
{
    private readonly ClipboardMonitor _clipboardMonitor;
    private readonly PolicyEngine _policyEngine;
    private readonly AuditLogger _auditLogger;
    private readonly AgentConfig _config;
    private readonly NotifyIcon _trayIcon;
    private readonly ContextMenuStrip _contextMenu;
    private readonly Icon _greenIcon;
    private readonly Icon _amberIcon;
    private readonly Icon _redIcon;
    private ToolStripMenuItem _statusItem;
    private ToolStripMenuItem _protectionItem;
    private ToolStripMenuItem _auditItem;
    private bool _isPaused;
    private TrayStatus _status = TrayStatus.Green;

    public TrayApplication(ClipboardMonitor clipboardMonitor, PolicyEngine policyEngine, AuditLogger auditLogger, AgentConfig config)
    {
        _clipboardMonitor = clipboardMonitor; _policyEngine = policyEngine; _auditLogger = auditLogger; _config = config;
        _greenIcon = CreateIcon(TrayStatus.Green); _amberIcon = CreateIcon(TrayStatus.Amber); _redIcon = CreateIcon(TrayStatus.Red);
        _contextMenu = new ContextMenuStrip();
        _statusItem = new ToolStripMenuItem("Maskit Agent — Active") { Enabled = false, Font = new Font(SystemFonts.MenuFont, FontStyle.Bold) };
        _contextMenu.Items.Add(_statusItem); _contextMenu.Items.Add(new ToolStripSeparator());
        _protectionItem = new ToolStripMenuItem("Protection: ON"); _protectionItem.Click += ToggleProtection; _contextMenu.Items.Add(_protectionItem);
        _auditItem = new ToolStripMenuItem("View audit log (last 10)"); _auditItem.Click += ShowAuditLog; _contextMenu.Items.Add(_auditItem);
        _contextMenu.Items.Add(new ToolStripSeparator());
        var settingsItem = new ToolStripMenuItem("Open config file"); settingsItem.Click += OpenConfig; _contextMenu.Items.Add(settingsItem);
        var exitItem = new ToolStripMenuItem("Exit"); exitItem.Click += Exit; _contextMenu.Items.Add(exitItem);
        _trayIcon = new NotifyIcon { Icon = _greenIcon, Visible = true, Text = "Maskit Agent — Protecting clipboard", ContextMenuStrip = _contextMenu };
        _clipboardMonitor.OnRedaction += OnRedaction;
        if (_config.ClipboardMonitoring) _clipboardMonitor.Start();
    }

    private void OnRedaction(string appName, int count)
    {
        _trayIcon.Icon = _amberIcon; _trayIcon.Text = $"Maskit — Redacted {count} item(s) in {appName}";
        if (_config.Notifications) _trayIcon.ShowBalloonTip(2000, "Maskit", $"Redacted {count} sensitive item(s) in clipboard ({appName})", ToolTipIcon.Warning);
        var timer = new System.Windows.Forms.Timer { Interval = 3000 };
        timer.Tick += (s, e) => { _trayIcon.Icon = _greenIcon; _trayIcon.Text = "Maskit Agent — Protecting clipboard"; timer.Stop(); timer.Dispose(); };
        timer.Start();
    }

    private void ToggleProtection(object? sender, EventArgs e)
    {
        _isPaused = !_isPaused;
        if (_isPaused) { _clipboardMonitor.Stop(); _trayIcon.Icon = _redIcon; _trayIcon.Text = "Maskit Agent — Paused"; _protectionItem.Text = "Protection: OFF"; _statusItem.Text = "Maskit Agent — Paused"; _status = TrayStatus.Red; }
        else { _clipboardMonitor.Start(); _trayIcon.Icon = _greenIcon; _trayIcon.Text = "Maskit Agent — Protecting clipboard"; _protectionItem.Text = "Protection: ON"; _statusItem.Text = "Maskit Agent — Active"; _status = TrayStatus.Green; }
    }

    private void ShowAuditLog(object? sender, EventArgs e)
    {
        var events = _auditLogger.GetRecentEvents(10);
        if (events.Length == 0) { MessageBox.Show("No audit events recorded yet.", "Maskit Audit Log", MessageBoxButtons.OK, MessageBoxIcon.Information); return; }
        var message = "Last 10 audit events:\n\n";
        foreach (var evt in events)
        {
            var time = DateTimeOffset.TryParse(evt.Timestamp, out var ts)
                ? ts.LocalDateTime
                : DateTime.Now;
            message += $"{time:HH:mm:ss} | {evt.DataType} | {evt.Action} | {evt.Application}\n";
        }
        MessageBox.Show(message, "Maskit Audit Log", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    private void OpenConfig(object? sender, EventArgs e)
    {
        try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo { FileName = _config.ConfigPath, UseShellExecute = true }); }
        catch (Exception ex) { MessageBox.Show($"Failed to open config: {ex.Message}", "Maskit", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }

    private void Exit(object? sender, EventArgs e)
    {
        _clipboardMonitor.Stop(); _trayIcon.Visible = false; _trayIcon.Dispose(); _greenIcon.Dispose(); _amberIcon.Dispose(); _redIcon.Dispose(); Application.Exit();
    }

    private static Icon CreateIcon(TrayStatus status)
    {
        var color = status switch { TrayStatus.Green => Color.FromArgb(0, 184, 148), TrayStatus.Amber => Color.FromArgb(246, 185, 59), TrayStatus.Red => Color.FromArgb(229, 80, 57), _ => Color.Gray };
        using var bmp = new Bitmap(16, 16);
        using var g = Graphics.FromImage(bmp); g.SmoothingMode = SmoothingMode.AntiAlias; g.Clear(Color.Transparent);
        using var brush = new SolidBrush(color); g.FillEllipse(brush, 2, 2, 12, 12);
        return Icon.FromHandle(bmp.GetHicon());
    }
    private enum TrayStatus { Green, Amber, Red }
}
