# Website link wiring

The supplied website design is kept as the visual source of truth. Add `site-links.js` after the page markup and use `data-maskit-link` on existing anchors to wire them without changing layout or copy.

Examples:

```html
<a data-maskit-link="chrome">Chrome download</a>
<a data-maskit-link="docs">Documentation</a>
<a data-maskit-link="github">GitHub</a>
```

Canonical release assets are always served from the latest GitHub Release. The asset names match `.github/workflows/release.yml`.