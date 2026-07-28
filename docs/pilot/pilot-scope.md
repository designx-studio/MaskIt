# Design partner pilot scope (MaskIt v2.4.0)

## Included

| Item | Detail |
|------|--------|
| Browser extension | Chrome/Edge primary; Firefox/Opera available |
| Supported AI sites | chatgpt.com, chat.openai.com, claude.ai, gemini.google.com, copilot.microsoft.com, \*.cursor.com |
| Policy actions | **allow**, **redact**, **block** (user-visible) |
| Local audit | Canonical events with irreversible value hashes |
| CLI | Optional for pilot power users |
| MCP server | Optional for Claude Desktop / Cursor style clients |
| Windows agent | **Optional beta** — clipboard protection only |
| Support model | Assisted design partner (not 24/7 SOC) |

## Excluded

| Item | Reason |
|------|--------|
| Full enterprise DLP | Out of product scope |
| All AI applications | Host/adapter limited |
| Central management / fleet console | Roadmap later; not in v2.4.0 |
| SIEM integration | Customer export only |
| Multi-tenant MSP control plane | Not built |
| Compliance certification (SOC 2, ISO 27001, GDPR cert) | Not claimed |
| Signed MSI / Web Store listing | Not guaranteed in pilot package |
| Unmask of redacted secrets | Removed from product |
| Zero false negatives | Pattern detection limits |

## Duration recommendation

- **30 days** design partner pilot  
- Week 1: install + baseline policy + training  
- Weeks 2–3: production use on listed hosts  
- Week 4: review metrics + go/no-go  

## Success metrics (suggested)

| Metric | Target example |
|--------|----------------|
| Install success on pilot cohort | ≥ 90% of assigned users |
| Confirmed redaction/block of synthetic secret tests | 100% of scripted checks |
| Accidental real-secret events caught (self-reported or audit) | Track count; qualitative win if ≥ 1 high-severity catch |
| False-positive tickets | Document rate; tune policy if blocking work |
| Audit export review completed | Admin sign-off |
| User understanding of pause/off risk | Spot check / survey |

Exact numbers should be agreed in the pilot SOW.

## Known limitations (must brief customer)

1. Unpacked browser extension may conflict with enterprise policy.  
2. Windows clipboard agent is beta and incomplete coverage.  
3. Detection is rule-based; novel secrets may slip.  
4. Audit is local and user-resettable.  
5. No remote killswitch/fleet inventory.  
6. Content allowed by policy still reaches the AI vendor.

## Customer responsibilities

- Provide pilot champion + admin  
- Approve browser install method  
- Define AI sites allowed for pilot  
- Use **synthetic** secrets in training demos  
- Report issues within agreed channel  
- Not represent MaskIt as certified compliance control  

## Vendor responsibilities

- Provide release packages + checksums  
- Provide pilot docs package (`docs/pilot/`)  
- Fix P0 claim/install blockers  
- Weekly check-in during pilot (recommended)  
- Transparent residual risk communication  

## Related

- [Pilot overview](01-pilot-overview.md)  
- [Claims ↔ evidence](../claims-evidence-matrix.md)  
- [Enterprise pilot readiness](../enterprise-pilot-readiness.md)  
