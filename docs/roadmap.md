# Maskit product roadmap

## Vision

**Maskit controls what humans and AI agents can share, access, and execute.**

The product should become the local policy boundary for AI work: browser prompts, clipboard flows, local files, developer tooling, MCP calls, and agent actions.

## Phase 1: production launch, now to 3 months

Ship the existing product as a credible release. Finish GitHub Release distribution, browser packages, runnable MCP and CLI packages, an honest Windows package, install and uninstall guides, privacy and security documentation, parity tests, artifact smoke tests, and a stable versioned policy contract.

**Exit criteria:** a new user downloads a package without cloning, completes a first scan, understands the decision, and can recover from a false positive.

## Phase 2: AI data protection platform, 3 to 9 months

Improve detection quality for secrets, source code, internal identifiers, documents, and structured files. Add confidence and explanations, policy simulation, versioned and signed policy bundles, team configuration, CI and pre-commit integrations, audit schema versioning, retention controls, export formats, device enrollment primitives, and local support diagnostics.

Why it matters: detection trust and shared policy are the bridge from an open-source utility to a product teams can govern and pay for.

## Phase 3: AI context firewall, 9 to 18 months

Build a local MCP security gateway. Normalize tool calls, arguments, resources, and results. Add allow, redact, block, and approval actions by server, tool, repository, path, data type, and user context. Filter secrets and disallowed files before agent context is assembled. Record agent activity without retaining raw values.

Why it matters: AI agents introduce machine actors, tool permissions, context assembly, and side effects. Maskit can own the decision point where data and actions meet.

## Phase 4: enterprise AI security platform, 18 to 24+ months

Add central policy management, organization and device scopes, SSO and SCIM, staged rollout, risk views, AI usage visibility, compliance exports, SIEM integrations, and managed deployment. The cloud layer should distribute policy and evidence, not become a mandatory raw-prompt inspection service.

## 12-month sequence

- Months 0 to 3: release reliability, install experience, detection trust, policy contracts, and design partners.
- Months 4 to 6: policy engine v2, signed bundles, simulation, CI workflows, and audit schema v2.
- Months 7 to 9: document and internal identifier detection, managed policy pilot, role-aware controls, and support diagnostics.
- Months 10 to 12: local MCP gateway alpha, tool inventory, permissions, repository controls, and agent activity timeline.

## 24-month sequence

- Months 13 to 18: gateway hardening, approvals, server trust, central policy service, SSO pilot, SIEM events, and minimal admin dashboard.
- Months 19 to 24: context firewall general availability, organization rollout, risk views, identity integrations, and enterprise support packages.

## Priority matrix

| Feature | Priority | Reason |
|---|---|---|
| Release and install reliability | P0 | Adoption blocker and trust signal |
| Detection accuracy and explanations | P0 | Core product credibility |
| Policy engine v2 | P0 | Makes behavior governable |
| Policy bundles and simulation | P0 | Enables team rollout without surprises |
| CI and pre-commit tools | P1 | Extends protection into developer flow |
| Audit schema and exports | P1 | Makes decisions reviewable |
| MCP gateway | P1 | Strategic expansion and differentiation |
| Tool permissions | P1 | Controls agent actions, not just data |
| File and repository controls | P1 | Strong developer and security use case |
| Central dashboard | P2 | Build after local enforcement proves demand |
| SSO, SCIM, and SIEM | P2 | Enterprise expansion, not the initial wedge |
| Broad SaaS DLP discovery | Avoid early | Expensive and weakly differentiated |
| Full network proxy | Avoid early | Conflicts with local-first wedge |

## Competitive position

Traditional DLP wins on breadth and compliance maturity. Browser security wins on session and shadow-AI visibility. AI governance wins on inventory and control-plane reporting. MCP and agent security products win on tool permissions and runtime monitoring.

Maskit should not compete on universal inspection. It should win on local enforcement for the paths cloud proxies miss, with one policy model shared across browser, Windows, CLI, MCP, files, repositories, and future agent gateways.

## Business model

Keep the detection engine, local CLI, browser extension, and basic MCP server open. Charge for team policy distribution, signed configuration, device enrollment, audit exports, support, SSO, SIEM, approvals, and managed deployment.

Best first buyers are 50 to 500-person engineering-led companies using ChatGPT, Claude, Cursor, GitHub Copilot, or MCP tooling and worried about source code, credentials, and customer data. Start with paid pilots priced by managed user or device, roughly $12 to $25 per managed user per month for team controls, with enterprise pricing for identity, deployment, and integrations.

## Build vs avoid

Build local enforcement, policy simulation, detection quality, tool and file permissions, signed policy bundles, and evidence that excludes raw secrets.

Avoid generic DLP replacement, cloud-only inspection, a giant provider catalog without evaluation data, and a dashboard-first strategy.

## Technical evolution

Current architecture: browser extension, shared JavaScript detection and sanitizer modules, engine policy and risk logic, MCP server, CLI and integrations, and .NET Windows agent.

Future architecture:

```text
Surface adapters
  Browser | Windows | CLI | CI | MCP client | Agent gateway
        -> Context normalizer
        -> Detection and classification
        -> Policy decision engine
        -> Transformation or action gate
        -> Evidence event stream
        -> Optional central policy and management sync
```

Build order: version the context and event schema, extract deterministic policy decisions, add simulation and parity fixtures, build the local MCP gateway, add file and repository adapters, then add central management.
