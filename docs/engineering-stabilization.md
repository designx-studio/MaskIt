# Engineering Stabilization Status

The stabilization plan is the scope gate for this release line. No new product scope is approved until every area reaches 8/10 with evidence.

## Implemented in this stabilization pass

- Popup status markup now exists and popup rendering is null-safe.
- Keyboard activation was added to the protection toggle.
- A deterministic policy simulation helper was added at `engine/simulation.js`.
- A browser-surface validation gate was added at `scripts/validate-browser-surface.js`.
- The engineering stabilization plan defines acceptance criteria for the shared rule engine, one event schema, popup behavior, unmasking, browser E2E, release verification, policy simulation, and confidence/explanations.

## Still blocked

- The hardcoded browser and Node detectors are not yet fully replaced by runtime-loaded `maskit-core` rules.
- The canonical context schema is not yet emitted by every surface.
- Browser E2E requires a real browser runner and packaged-extension fixtures.
- Unmasking remains incomplete until the UI restores values and expiry is tested.
- Artifact signing requires a configured signing identity; checksums alone are not signatures.
- Policy simulation is available as a helper but is not yet exposed through every CLI/MCP surface.

These are explicit blockers, not marketing claims. The repository remains Late Alpha until the gates are green.