#!/usr/bin/env node
/**
 * Packaged extension E2E.
 *
 * 1) Build/verify production Chrome ZIP + staging
 * 2) Prefer full Chromium extension load (Playwright + system Chrome/Edge)
 * 3) If OS blocks --load-extension, fall back to packaged-file surface E2E:
 *    inject the real dist scripts, prove detect → mask → canonical audit, render popup
 *
 * Failure screenshots/logs: dist/e2e-failures/
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const failureDir = path.join(dist, "e2e-failures");
const log = [];

function logLine(msg) {
  const line = `[e2e] ${msg}`;
  console.log(line);
  log.push(line);
}

function ensureFailureDir() {
  fs.mkdirSync(failureDir, { recursive: true });
}

function writeFailureLog(name, extra = "") {
  ensureFailureDir();
  fs.writeFileSync(path.join(failureDir, `${name}.log`), log.join("\n") + (extra ? `\n\n${extra}` : "") + "\n");
}

async function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    execFileSync("npm", ["install", "--no-save", "playwright@1.49.1"], {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    return require("playwright");
  }
}

function ensureBuild() {
  const zip = path.join(dist, "maskit-chrome.zip");
  const staging = path.join(dist, "maskit-chrome");
  if (!fs.existsSync(zip) || !fs.existsSync(path.join(staging, "manifest.json"))) {
    logLine("Building extension artifacts...");
    execFileSync(process.execPath, [path.join(root, "scripts", "build.js")], { cwd: root, stdio: "inherit" });
  }
  if (!fs.existsSync(zip)) throw new Error("maskit-chrome.zip missing after build");
  if (!fs.existsSync(path.join(staging, "manifest.json"))) throw new Error("maskit-chrome staging missing after build");

  const required = [
    "manifest.json", "background.js", "content.js", "settings.js", "browser-rules.js",
    "context-event.js", "detector.js", "sanitizer.js", "popup.html", "popup.js"
  ];
  for (const file of required) {
    if (!fs.existsSync(path.join(staging, file))) throw new Error(`Packaged staging missing ${file}`);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(staging, "manifest.json"), "utf8"));
  if (manifest.manifest_version !== 3) throw new Error("Packaged extension is not Manifest V3");
  if (!manifest.content_scripts?.[0]?.js?.includes("browser-rules.js")) {
    throw new Error("Packaged content scripts missing browser-rules.js");
  }
  if (!manifest.content_scripts?.[0]?.js?.includes("context-event.js")) {
    throw new Error("Packaged content scripts missing context-event.js");
  }
  return { zip, staging, manifest };
}

function prepareE2EExtension(staging) {
  const e2eDir = path.join(dist, "maskit-chrome-e2e");
  fs.rmSync(e2eDir, { recursive: true, force: true });
  fs.cpSync(staging, e2eDir, { recursive: true });
  const manifestPath = path.join(e2eDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  delete manifest.browser_specific_settings;
  const localMatch = "http://127.0.0.1/*";
  manifest.host_permissions = Array.from(new Set([...(manifest.host_permissions || []), localMatch]));
  if (manifest.content_scripts?.[0]) {
    manifest.content_scripts[0].matches = Array.from(
      new Set([...(manifest.content_scripts[0].matches || []), localMatch])
    );
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return e2eDir;
}

function startFixtureServer(extensionDir) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ChatGPT Fixture</title></head>
<body>
  <h1>Maskit AI fixture</h1>
  <textarea id="prompt" rows="6" cols="60" placeholder="Message ChatGPT"></textarea>
  <div id="status">ready</div>
</body></html>`;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname.startsWith("/ext/")) {
      const rel = decodeURIComponent(url.pathname.slice("/ext/".length));
      const full = path.join(extensionDir, rel);
      if (!full.startsWith(extensionDir) || !fs.existsSync(full)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = path.extname(full);
      const type = ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "text/plain";
      res.writeHead(200, { "Content-Type": type });
      res.end(fs.readFileSync(full));
      return;
    }
    if (url.pathname === "/popup") {
      let popup = fs.readFileSync(path.join(extensionDir, "popup.html"), "utf8");
      popup = popup
        .replace('href="popup.css"', 'href="/ext/popup.css"')
        .replace('src="settings.js"', 'src="/ext/settings.js"')
        .replace('src="popup.js"', 'src="/ext/popup.js"');
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(popup);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port, url: `http://127.0.0.1:${port}/` });
    });
  });
}

async function tryFullExtensionLoad(chromium, extensionPath, fixture) {
  const userDataDir = path.join(dist, "e2e-profile");
  fs.rmSync(userDataDir, { recursive: true, force: true });
  const extArg = extensionPath.replace(/\\/g, "/");
  const launchArgs = [
    `--disable-extensions-except=${extArg}`,
    `--load-extension=${extArg}`,
    "--disable-features=DisableLoadExtensionCommandLineSwitch",
    "--no-first-run",
    "--no-default-browser-check"
  ];

  for (const channel of ["chrome", "msedge"]) {
    try {
      logLine(`Attempting full extension load via channel=${channel}`);
      const context = await chromium.launchPersistentContext(userDataDir, {
        channel,
        headless: false,
        args: launchArgs,
        ignoreDefaultArgs: ["--disable-extensions"]
      });
      let extensionId = null;
      try {
        const sw = context.serviceWorkers().find((w) => w.url().startsWith("chrome-extension://"))
          || await context.waitForEvent("serviceworker", { timeout: 8000 });
        if (sw && sw.url().startsWith("chrome-extension://")) extensionId = new URL(sw.url()).host;
      } catch {
        /* fall through */
      }
      if (!extensionId) {
        await context.close();
        fs.rmSync(userDataDir, { recursive: true, force: true });
        logLine(`channel=${channel}: extension service worker not found`);
        continue;
      }
      logLine(`Full extension load succeeded: ${extensionId}`);
      return { context, extensionId, mode: "extension" };
    } catch (err) {
      logLine(`channel=${channel} failed: ${err.message}`);
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  }
  return null;
}

async function runPackagedSurfaceE2E(chromium, extensionDir, fixture) {
  logLine("Running packaged-file surface E2E (detect → mask → audit → popup)");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true
  }).catch(async () => chromium.launch({ channel: "msedge", headless: true }));

  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (err) => logLine(`pageerror: ${err.message}`));

  // Mock chrome.* APIs used by popup and content path
  await page.addInitScript(() => {
    const store = {
      local: {
        enabled: true,
        scanPaste: true,
        scanTyping: true,
        reviewBeforeRedact: false,
        redactFormat: "stars",
        EMAIL: true,
        API_KEY: true,
        stats: { totalRedactions: 0, byType: {}, bySource: { paste: 0, copy: 0, typing: 0 } },
        auditLog: { events: [], retentionDays: 30 }
      },
      session: { paused: false }
    };
    const listeners = [];
    window.__maskitAudit = [];
    window.chrome = {
      storage: {
        local: {
          get(defaults, cb) {
            const out = { ...defaults, ...store.local };
            if (typeof defaults === "object" && !Array.isArray(defaults)) {
              Object.keys(defaults).forEach((k) => {
                if (store.local[k] !== undefined) out[k] = store.local[k];
              });
            }
            cb(out);
          },
          set(values, cb) {
            Object.assign(store.local, values);
            listeners.forEach((fn) => fn(Object.fromEntries(Object.keys(values).map((k) => [k, { newValue: values[k] }])), "local"));
            if (cb) cb();
          }
        },
        session: {
          get(defaults, cb) { cb({ ...defaults, ...store.session }); },
          set(values, cb) { Object.assign(store.session, values); if (cb) cb(); }
        },
        onChanged: { addListener(fn) { listeners.push(fn); } }
      },
      runtime: {
        sendMessage(message, cb) {
          if (message.type === "RECORD_AUDIT_EVENTS") {
            window.__maskitAudit.push(...(message.events || []));
            store.local.auditLog.events.push(...(message.events || []));
          }
          if (message.type === "RECORD_REDACTIONS") {
            const added = Object.values(message.counts || {}).reduce((a, b) => a + b, 0);
            store.local.stats.totalRedactions += added;
            store.local.stats.bySource[message.source] = (store.local.stats.bySource[message.source] || 0) + added;
          }
          if (message.type === "GET_STATS") return cb && cb({ stats: store.local.stats });
          if (message.type === "GET_PAUSE_STATE") return cb && cb({ paused: !!store.session.paused });
          if (message.type === "GET_AUDIT_LOG") return cb && cb({ auditLog: store.local.auditLog });
          if (cb) cb({ ok: true });
        },
        lastError: null,
        getURL(p) { return p; },
        onMessage: { addListener() {} }
      },
      tabs: {
        query(q, cb) { cb([{ id: 1, url: location.href, active: true }]); },
        sendMessage() {}
      },
      action: {
        setBadgeText() {},
        setBadgeBackgroundColor() {},
        setTitle() {}
      }
    };
  });

  await page.goto(fixture.url, { waitUntil: "domcontentloaded" });

  // Inject packaged extension scripts in content-script order
  for (const file of ["settings.js", "browser-rules.js", "context-event.js", "detector.js", "sanitizer.js"]) {
    await page.addScriptTag({ url: `${fixture.url}ext/${file}` });
  }

  const sensitive = "Contact me at secret.user@example.com for access";
  const result = await page.evaluate((text) => {
    const findings = detectSensitiveData(text, MASKIT_DEFAULTS);
    const redacted = sanitizeText(text, findings, { ...MASKIT_DEFAULTS, redactFormat: "stars" });
    const events = findings.map((f) => createEventFromFinding({
      finding: f,
      decision: { action: "redact" },
      context: { source: "paste", app: location.hostname || "127.0.0.1" },
      settings: MASKIT_DEFAULTS
    }));
    // Persist via mocked runtime (same path content.js uses)
    chrome.runtime.sendMessage({ type: "RECORD_AUDIT_EVENTS", events });
    chrome.runtime.sendMessage({
      type: "RECORD_REDACTIONS",
      source: "paste",
      counts: findings.reduce((acc, f) => {
        acc[f.type] = (acc[f.type] || 0) + 1;
        return acc;
      }, {})
    });
    document.getElementById("prompt").value = redacted;
    return {
      findings,
      redacted,
      events,
      audit: window.__maskitAudit.slice()
    };
  }, sensitive);

  logLine(`Findings: ${JSON.stringify(result.findings.map((f) => f.type))}`);
  logLine(`Redacted: ${result.redacted}`);

  if (!result.findings.some((f) => f.type === "EMAIL")) {
    await page.screenshot({ path: path.join(failureDir, "no-detection.png"), fullPage: true });
    throw new Error("Packaged detector did not find EMAIL");
  }
  if (result.redacted.includes("secret.user@example.com") || !result.redacted.includes("***")) {
    await page.screenshot({ path: path.join(failureDir, "no-mask.png"), fullPage: true });
    throw new Error("Packaged sanitizer did not mask EMAIL");
  }
  const event = result.events[0];
  if (!event || event.schemaVersion !== "1.0" || !event.eventId || !event.matchedValueHash) {
    throw new Error("Canonical audit event missing required fields");
  }
  if (event.value || event.matchedValue || event.unmaskToken) {
    throw new Error("Audit event contained forbidden raw/unmask fields");
  }
  if (!result.audit.length) throw new Error("Audit events were not recorded via runtime path");
  logLine("Detection, masking, and canonical audit confirmed");
  await page.screenshot({ path: path.join(failureDir, "mask-ok.png"), fullPage: true });

  // Popup behaviour against packaged popup.html/js
  const popup = await context.newPage();
  await popup.addInitScript(() => {
    // reuse chrome mock by copying from opener is not automatic; reinstall minimal mock
    const store = {
      local: {
        enabled: true,
        siteListMode: "all",
        siteList: [],
        stats: { totalRedactions: 3, byType: { EMAIL: 1 }, bySource: { paste: 1, copy: 0, typing: 0 } }
      },
      session: { paused: false }
    };
    window.chrome = {
      storage: {
        local: {
          get(defaults, cb) { cb({ ...defaults, ...store.local }); },
          set(values, cb) { Object.assign(store.local, values); if (cb) cb(); }
        },
        session: {
          get(defaults, cb) { cb({ ...defaults, ...store.session }); },
          set(values, cb) { Object.assign(store.session, values); if (cb) cb(); }
        },
        onChanged: { addListener() {} }
      },
      runtime: {
        sendMessage(message, cb) {
          if (message.type === "GET_STATS") return cb && cb({ stats: store.local.stats });
          if (message.type === "GET_PAUSE_STATE") return cb && cb({ paused: false });
          if (cb) cb({ ok: true });
        },
        lastError: null
      },
      tabs: {
        query(q, cb) { cb([{ id: 1, url: "http://127.0.0.1/", active: true }]); }
      }
    };
  });
  await popup.goto(`${fixture.url}popup`, { waitUntil: "domcontentloaded" });
  await popup.waitForTimeout(300);
  const badge = await popup.locator("#status-badge").textContent();
  const total = await popup.locator("#stat-total").textContent();
  const label = await popup.locator("#tl-label").textContent();
  logLine(`Popup badge=${badge} total=${total} tl=${label}`);
  if (!badge) throw new Error("Popup status badge missing");
  if (!label) throw new Error("Popup traffic-light label missing");
  await popup.screenshot({ path: path.join(failureDir, "popup-ok.png") });
  logLine("Popup behaviour confirmed");

  await browser.close();
  return { mode: "packaged-surface" };
}

async function main() {
  ensureFailureDir();
  logLine("Starting packaged Chromium E2E");
  const { staging } = ensureBuild();
  const extensionDir = prepareE2EExtension(staging);
  logLine(`Extension path: ${extensionDir}`);

  const { chromium } = await loadPlaywright();
  const fixture = await startFixtureServer(extensionDir);
  logLine(`Fixture server at ${fixture.url}`);

  try {
    const full = await tryFullExtensionLoad(chromium, extensionDir, fixture);
    if (full) {
      // Minimal verification path when full load works
      const page = await full.context.newPage();
      const sw = full.context.serviceWorkers().find((w) => w.url().includes(full.extensionId));
      if (sw) {
        await sw.evaluate(() => new Promise((resolve) => {
          chrome.storage.local.set({
            enabled: true, scanPaste: true, reviewBeforeRedact: false, redactFormat: "stars", EMAIL: true
          }, resolve);
        }));
      }
      await page.goto(fixture.url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const sensitive = "Contact me at secret.user@example.com for access";
      await page.locator("#prompt").click();
      await page.evaluate((text) => {
        const el = document.getElementById("prompt");
        const dt = new DataTransfer();
        dt.setData("text/plain", text);
        el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      }, sensitive);
      await page.waitForTimeout(800);
      let value = await page.locator("#prompt").inputValue();
      if (value.includes("secret.user@example.com")) {
        await page.locator("#prompt").fill("");
        await page.locator("#prompt").type(sensitive, { delay: 5 });
        await page.waitForTimeout(1200);
        value = await page.locator("#prompt").inputValue();
      }
      logLine(`Full-load textarea value: ${JSON.stringify(value)}`);
      if (value.includes("secret.user@example.com") && !value.includes("***")) {
        await page.screenshot({ path: path.join(failureDir, "full-load-no-mask.png"), fullPage: true });
        throw new Error("Full extension load did not mask sensitive input");
      }
      const popup = await full.context.newPage();
      await popup.goto(`chrome-extension://${full.extensionId}/popup.html`);
      await popup.waitForTimeout(300);
      const badge = await popup.locator("#status-badge").textContent();
      if (!badge) throw new Error("Popup did not render under full extension load");
      await popup.screenshot({ path: path.join(failureDir, "popup-ok.png") });
      await full.context.close();
      logLine("Full extension E2E passed");
    } else {
      logLine("Full extension load unavailable on this host; using packaged-file surface E2E");
      await runPackagedSurfaceE2E(chromium, extensionDir, fixture);
    }

    fs.writeFileSync(path.join(failureDir, "e2e-success.log"), log.join("\n") + "\n");
    console.log("Packaged Chromium extension E2E passed.");
  } catch (error) {
    writeFailureLog("e2e-error", error.stack || String(error));
    console.error(error);
    process.exitCode = 1;
  } finally {
    fixture.server.close();
  }
}

main().catch((error) => {
  writeFailureLog("fatal", error.stack || String(error));
  console.error(error);
  process.exit(1);
});
