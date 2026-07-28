/* Canonical links for the supplied Maskit website design. */
window.MASKIT_LINKS = Object.freeze({
  github: 'https://github.com/designx-studio/MaskIt',
  release: 'https://github.com/designx-studio/MaskIt/releases/latest',
  chrome: 'https://github.com/designx-studio/MaskIt/releases/latest/download/maskit-chrome.zip',
  edge: 'https://github.com/designx-studio/MaskIt/releases/latest/download/maskit-edge.zip',
  firefox: 'https://github.com/designx-studio/MaskIt/releases/latest/download/maskit-firefox.zip',
  opera: 'https://github.com/designx-studio/MaskIt/releases/latest/download/maskit-opera.zip',
  windows: 'https://github.com/designx-studio/MaskIt/releases/latest/download/maskit-windows-agent.zip',
  mcp: 'https://github.com/designx-studio/MaskIt/releases/latest/download/maskit-mcp.tar.gz',
  cli: 'https://github.com/designx-studio/MaskIt/releases/latest/download/maskit-cli.tar.gz',
  docs: '../docs/index.html',
  install: '../docs/installation.md',
  browser: '../docs/browser-extension.md',
  mcpDocs: '../docs/mcp-server.md',
  cliDocs: '../docs/cli.md',
  windowsDocs: '../docs/windows-agent.md',
  privacy: 'privacy-policy.html',
  security: 'security.html',
  roadmap: 'roadmap.html',
  license: '../LICENSE'
});

document.querySelectorAll('[data-maskit-link]').forEach((el) => {
  const key = el.getAttribute('data-maskit-link');
  if (window.MASKIT_LINKS[key]) el.href = window.MASKIT_LINKS[key];
});