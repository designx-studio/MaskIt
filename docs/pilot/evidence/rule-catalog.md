# Rule catalog (MaskIt v2.4.0)

Generated from maskit-core/rules/*.json. Shared by browser, CLI, MCP, and Windows.

| Rule ID | Category | Description | Severity |
|---------|----------|-------------|----------|
| EMAIL | pii | Email addresses | medium |
| PHONE | pii | Kenyan phone numbers | medium |
| SSN | pii | US Social Security Numbers | critical |
| PASSPORT | pii | Passport numbers | high |
| IP_ADDRESS | pii | IP addresses | high |
| CARD | financial | Credit/debit card numbers | critical |
| BANK_ACCOUNT | financial | IBAN bank account numbers | critical |
| MPESA | financial | M-Pesa reference codes | low |
| API_KEY_OPENAI | secrets | OpenAI API keys | critical |
| API_KEY_ANTHROPIC | secrets | Anthropic API keys | critical |
| API_KEY_STRIPE | secrets | Stripe secret/test keys | critical |
| API_KEY_GITHUB | secrets | GitHub personal access tokens | critical |
| API_KEY_GITHUB_FINE | secrets | GitHub fine-grained tokens | critical |
| API_KEY_GITLAB | secrets | GitLab personal access tokens | critical |
| API_KEY_SLACK | secrets | Slack tokens | critical |
| API_KEY_AWS_ACCESS | secrets | AWS access key IDs | critical |
| API_KEY_AWS_SECRET | secrets | AWS secret access keys | critical |
| API_KEY_GCP | secrets | Google Cloud API keys | critical |
| API_KEY_GCP_OAUTH | secrets | Google OAuth tokens | critical |
| API_KEY_NPM | secrets | npm access tokens | critical |
| API_KEY_SQUARE | secrets | Square access tokens | critical |
| API_KEY_BEARER | secrets | Bearer tokens | critical |
| API_KEY_CONFIG_ASSIGNMENT | secrets | Config assignment patterns | critical |
| API_KEY_AZURE_CONN | secrets | Azure connection strings | critical |
| API_KEY_AZURE_JWT | secrets | Azure AD JWT tokens | critical |
| API_KEY_AZURE_SUB | secrets | Azure subscription keys | high |
| API_KEY_DIGITALOCEAN | secrets | DigitalOcean tokens | critical |
| API_KEY_TWILIO | secrets | Twilio account SIDs | critical |
| API_KEY_DATADOG | secrets | Datadog API keys | critical |
| API_KEY_SENDGRID | secrets | SendGrid API keys | critical |
| API_KEY_ATLASSIAN | secrets | Atlassian/Jira API tokens | critical |
| API_KEY_TERRAFORM | secrets | Terraform Cloud tokens | critical |
| API_KEY_DOCKER | secrets | Docker Hub tokens | critical |
| API_KEY_K8S | secrets | Kubernetes service account tokens | critical |
| API_KEY_CLOUDFLARE | secrets | Cloudflare API tokens | critical |
| API_KEY_AUTH0 | secrets | Auth0 tokens | critical |
| API_KEY_FIREBASE | secrets | Firebase API keys | critical |
| API_KEY_AZURE_DEVOPS | secrets | Azure DevOps tokens | critical |
| API_KEY_GCP_SA | secrets | GCP service account private keys | critical |
| API_KEY_GENERIC_CLIENT_SECRET | secrets | Generic client secrets | critical |

**Total rules:** 40
