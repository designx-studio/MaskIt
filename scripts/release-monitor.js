#!/usr/bin/env node
'use strict';

const owner = process.env.GITHUB_REPOSITORY_OWNER || 'designx-studio';
const repo = process.env.GITHUB_REPOSITORY_NAME || 'MaskIt';
const tag = process.argv[2] || process.env.MASKIT_TAG || 'v3.0.0';
const intervalMs = Number(process.env.MASKIT_MONITOR_INTERVAL_MS || 15000);
const timeoutMs = Number(process.env.MASKIT_MONITOR_TIMEOUT_MS || 900000);
const token = process.env.GITHUB_TOKEN || '';
const expectedAssets = ['maskit-chrome.zip','maskit-edge.zip','maskit-firefox.zip','maskit-opera.zip','maskit-windows-agent.zip','maskit-mcp.tar.gz','maskit-cli.tar.gz'];
const headers = { accept: 'application/vnd.github+json', 'user-agent': 'maskit-release-monitor' };
if (token) headers.authorization = `Bearer ${token}`;
const api = `https://api.github.com/repos/${owner}/${repo}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function get(url) {
  const response = await fetch(url, { headers });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
  return response.json();
}
async function main() {
  const started = Date.now();
  console.log(`Monitoring ${owner}/${repo} ${tag}`);
  while (Date.now() - started < timeoutMs) {
    const release = await get(`${api}/releases/tags/${encodeURIComponent(tag)}`);
    if (release) {
      const names = new Set((release.assets || []).map(asset => asset.name));
      const missing = expectedAssets.filter(name => !names.has(name));
      if (release.draft || release.prerelease) console.log(`Release exists but is draft/prerelease: ${release.html_url}`);
      else if (missing.length) console.log(`Release published, waiting for assets: ${missing.join(', ')}`);
      else {
        console.log(`RELEASE READY ${release.html_url}`);
        for (const asset of release.assets) console.log(`${asset.name} ${asset.browser_download_url}`);
        return;
      }
    } else {
      const runs = await get(`${api}/actions/runs?event=push&per_page=20`);
      const run = (runs?.workflow_runs || []).find(item => item.head_branch === tag || item.head_sha === tag);
      if (run) console.log(`Workflow ${run.status}: ${run.html_url}`);
      else console.log('Waiting for release workflow to start...');
    }
    await sleep(intervalMs);
  }
  throw new Error(`Timed out after ${Math.round(timeoutMs / 60000)} minute(s)`);
}
main().catch(error => { console.error(`RELEASE MONITOR FAILED: ${error.message}`); process.exit(1); });
