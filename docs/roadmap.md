# Maskit official product roadmap

## Vision

Maskit controls sensitive context before it reaches AI systems, agents, tools, and workflows.

Maskit is not becoming generic DLP, phishing protection, a secure browser, an AI assistant, or a cloud proxy that sees every prompt. It is becoming an **AI Context Security Platform** with local enforcement first and optional management later.

## Current maturity

Shipped foundations:

- Browser extension for supported AI hosts
- Local detection engine
- Secret and API key detection
- PII detection
- Financial data detection
- Redaction engine
- Allow, redact, and block policy actions
- Local audit logging
- MCP server foundation
- Windows clipboard agent foundation
- CLI foundation
- Open source MIT distribution

Still immature:

- Production release distribution and upgrade confidence
- Stable cross surface event and policy contracts
- Detection explanations and false positive controls
- Central policy management
- Device enrollment and fleet visibility
- File and repository boundaries
- MCP permissions and approval workflows
- Enterprise reporting and integrations

## 18 month roadmap

### Phase 1, production readiness, 0 to 3 months

| Feature | User problem | Why Maskit should build it | Customer value | Complexity | Dependencies | Revenue impact | Priority |
|---|---|---|---|---|---|---|---|
| Release automation | Users cannot reliably install the product | Distribution is the current adoption gate | Trustworthy downloads and upgrades | Medium | Build scripts, CI | High | P0 |
| Versioning and checksums | Buyers need artifact confidence | Security software must be verifiable | Safer rollout and support | Low | Release workflow | Medium | P0 |
| Installation experience | First success takes too much work | Developer adoption depends on time to value | Install in minutes, not hours | Low | Package names, docs | High | P0 |
| Detection accuracy | False positives cause disablement | Detection trust is the core product loop | Fewer interruptions and support cases | Medium | Fixtures and benchmarks | High | P0 |
| Detection explanations | Users do not know why data matched | Explainability improves confidence | Faster decisions and safer exceptions | Medium | Finding metadata | High | P0 |
| Custom rules | Teams have internal identifiers | Local extensibility is a differentiator | Protect company specific data | Low | Regex safety checks | Medium | P0 |
| Policy separation | Detection and action logic can drift | One deterministic policy contract is required | Consistent behavior across surfaces | High | Context and event schema | Very high | P0 |
| Policy simulation | Teams fear blocking useful work | Dry run is needed before enforcement | Safer rollout | Medium | Policy engine | High | P0 |
| CLI and MCP quick starts | Developers cannot evaluate quickly | Vexp style onboarding is a clear market advantage | Faster pilots | Low | Docs and examples | High | P0 |
| Security testing | Sensitive software needs proof | Regression and package tests create trust | Safer releases | Medium | CI and fixtures | High | P0 |

**Phase 1 milestone:** a developer installs Maskit, scans a prompt, understands the finding, changes a policy, and sees a local audit event in five minutes. No release moves forward until tests, packages, docs, and download links agree.

### Phase 2, AI security control layer, 3 to 6 months

| Feature | User problem | Why Maskit should build it | Customer value | Complexity | Dependencies | Revenue impact | Priority |
|---|---|---|---|---|---|---|---|
| Context classification | Text alone does not express destination or actor | Policy needs surface, app, actor, and destination | Better decisions than generic DLP | High | Context schema | Very high | P0 |
| Risk scoring | Teams cannot prioritize events | Explainable risk supports rollout | Clear remediation order | Medium | Classification and policy | High | P1 |
| Signed policy bundles | Local rules can diverge or be tampered with | Teams need trusted shared configuration | Controlled rollout | Medium | Policy schema | High | P0 |
| File protection | Agents can expose sensitive files | File access is the next context boundary | Safer coding workflows | High | Context adapters | Very high | P1 |
| Repository protection | Source code and history need scope | Repository identity gives policy meaning | Protect proprietary code | High | Git integration | Very high | P1 |
| CI and pre commit scanning | Secrets are exposed before a prompt exists | Catch leakage earlier in the developer path | Fewer incidents | Medium | CLI and policy engine | High | P0 |
| MCP permissions | Tool calls can access too much | MCP is the natural expansion from current server work | Least privilege for AI tools | High | MCP gateway contract | Very high | P1 |
| Tool approval workflow | High risk actions need a human checkpoint | Approval bridges safety and productivity | Safer agent adoption | High | Permissions and identity | Very high | P1 |

All surfaces use the same contract:

```text
Browser -> Windows agent -> CLI -> CI/CD -> MCP -> future agent gateway
                     \-> context normalization
                         -> detection and classification
                         -> policy decision
                         -> action enforcement
                         -> local evidence
```

### Phase 3, enterprise management, 6 to 12 months

| Feature | User problem | Why Maskit should build it | Customer value | Complexity | Dependencies | Revenue impact | Priority |
|---|---|---|---|---|---|---|---|
| Organization accounts | Teams need shared ownership | Enables paid team deployment | Accountability and support | Medium | Identity model | High | P1 |
| Device enrollment | Admins cannot control rollout | Management is needed after local enforcement works | Fleet consistency | High | Agent identity | Very high | P1 |
| Policy management | Teams need versioning and rollback | Central policy is the paid control plane | Safer governance | High | Signed bundles | Very high | P0 |
| Fleet visibility | Security teams need health without raw prompts | Non sensitive state is enough for first management layer | Deployment confidence | Medium | Device events | High | P1 |
| Security dashboard | Event review is fragmented | Enterprise buyers need operational visibility | Faster response | High | Evidence schema | High | P1 |
| Evidence reporting | Audits require stable proof | Exportable evidence supports evaluations | Shorter security reviews | Medium | Audit schema | High | P1 |
| User roles | Admin and operator scopes differ | Least privilege must apply to management | Safer administration | Medium | Organization accounts | High | P1 |
| SSO | Enterprise teams need controlled access | Standard buyer requirement | Easier procurement | Medium | Identity model | Medium | P2 |
| SIEM export | Security teams need existing workflows | Evidence should flow into operations | Better incident response | Medium | Event schema | Medium | P2 |

The management cloud stores by default:

- Organization and user identifiers
- Device enrollment and software version
- Policy versions, approvals, and rollout state
- Aggregated counts and risk categories
- Audit metadata without raw values
- Health and connectivity state

The management cloud does not store by default:

- Raw prompts
- Clipboard contents
- Raw file contents
- Secret values
- Full model conversations

Local enforcement remains available when the management service is unreachable.

### Phase 4, AI agent security platform, 12 to 18 months

| Feature | Build decision | Why | Market value | Complexity | Priority |
|---|---|---|---|---|---|
| MCP security gateway | Build | It extends current MCP work into a governed boundary | Very high | High | P0 |
| Agent permissions | Build | Data redaction is not enough when agents can act | Very high | High | P0 |
| Agent identity | Build carefully | Policies need a stable actor separate from the model | High | High | P1 |
| Repository boundaries | Build | Coding agents need explicit scope | Very high | High | P0 |
| File access control | Build | Least privilege must apply to context assembly | Very high | High | P0 |
| Approval workflows | Build | High risk actions need review | High | High | P1 |
| Agent activity timeline | Build | Security teams need evidence of actions | High | Medium | P1 |
| Tool trust scoring | Build after inventory | MCP supply chain risk is real, but scoring needs data | High | High | P1 |

## Technical architecture evolution

### Current components

Browser extension, Windows agent, MCP server, CLI, shared detection engine, sanitizer, policy actions, and local audit log.

### Future components

```text
Surface adapters
  Browser | Windows | CLI | CI | MCP client | Agent gateway
        -> Context normalization layer
        -> Detection and classification engine
        -> Policy decision engine
        -> Action enforcement
        -> Evidence event system
        -> Optional management cloud
```

Create:

- Versioned context and event schemas
- Pure policy decision module
- Classification and confidence layer
- File, repository, and tool adapters
- Local MCP gateway
- Signed policy distribution
- Management API for policy and non sensitive evidence

Merge:

- Browser, engine, MCP, CLI, and Windows policy vocabulary
- Audit event formats
- Detection fixtures and parity tests

Keep local:

- Raw prompts
- Clipboard content
- Raw files
- Secret values
- Redaction and blocking decisions
- Enforcement when cloud management is unavailable

Required APIs:

- `scanContext(context, policy)`
- `classifyContext(context)`
- `evaluatePolicy(context, findings, policy)`
- `transformContext(context, decision)`
- `recordEvidence(event)`
- `syncPolicyBundle(bundle)`
- `reportDeviceState(state)`

## Business roadmap

### Stage 1, developers and technical teams

Free offering: browser extension, local CLI, basic MCP server, shared engine, local audit, and open source code.

Customers pay for reliability, support, signed policies, and team configuration.

### Stage 2, engineering organizations

Professional offering: shared policy bundles, device enrollment, policy simulation, CI controls, audit exports, and management dashboard.

Customers pay for managed users or devices, deployment control, and support.

### Stage 3, enterprise security teams

Enterprise offering: SSO, roles, fleet management, MCP gateway, tool permissions, approvals, SIEM export, and evidence workflows.

Customers pay for governance, scale, integrations, and assurance.

### Stage 4, MSP channel

MSP offering: multi tenant policy management, assessment reports, branded evidence exports, and managed rollout.

Build this after the direct product has stable controls. MSP packaging should amplify the product, not distract from it.

## Features to avoid

- Generic endpoint DLP
- Full secure browser isolation
- Consumer phishing and scam detection
- Cloud proxy that requires raw prompt capture
- AI model hosting
- Broad compliance certification claims
- Silent policy automation
- Dashboard first development before local enforcement is reliable

## Biggest risks

1. Scope expansion into generic DLP.
2. False positives that teach users to disable protection.
3. Policy drift between browser, MCP, CLI, and Windows.
4. Agent permissions built before a stable context schema.
5. Cloud management that undermines local first trust.
6. Unsupported marketing claims.
7. Release and installation friction.

## First ten engineering priorities

1. Ship a real v3 release with verified assets.
2. Version context and evidence schemas.
3. Separate detection from policy decisions.
4. Add detection explanations and fixture benchmarks.
5. Add policy simulation.
6. Harden custom rule validation.
7. Make CLI and MCP onboarding one minute.
8. Add CI and pre commit scanning.
9. Build signed policy bundles.
10. Prototype the local MCP gateway.

## Definition of a successful Maskit v3.0

Maskit v3.0 is successful when:

- A new user can install it without cloning or compiling.
- Browser, MCP, CLI, and Windows behavior agree on the same fixtures.
- Findings include a clear explanation and confidence signal.
- Policies can be simulated before enforcement.
- Local audit evidence never contains raw secrets.
- Release artifacts, documentation, and website links are verified automatically.
- At least three technical teams use it in real AI workflows.
- The product is honest about beta features and unsupported claims.
- A team can adopt Maskit without sending raw prompts to a Maskit cloud service.
