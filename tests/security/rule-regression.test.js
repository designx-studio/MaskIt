const assert = require("assert");
const engine = require("../../engine");

console.log("Running rule-regression.test.js...");

// Helpers
function getFinding(text, ruleName) {
  const result = engine.scanText(text);
  return result.findings.find(f => f.ruleName === ruleName);
}

// 1. PII Rules Validation
{
  // Email
  const emailFinding = getFinding("My email is user.name+tag@example.co.uk", "EMAIL");
  assert.ok(emailFinding, "EMAIL matching failed");
  assert.strictEqual(emailFinding.confidence, 0.9);
  assert.strictEqual(emailFinding.severity, "medium");

  // Phone (Kenyan)
  const phoneFinding = getFinding("Call me on +254712345678 or 0712345678", "PHONE");
  assert.ok(phoneFinding, "PHONE matching failed");
  assert.strictEqual(phoneFinding.confidence, 0.85);

  // SSN
  const ssnFinding = getFinding("My SSN is 000-12-3456", "SSN");
  assert.ok(ssnFinding, "SSN matching failed");
  assert.strictEqual(ssnFinding.confidence, 0.9);
  assert.strictEqual(ssnFinding.severity, "critical");

  // Passport
  const passportFinding = getFinding("Passport number A12345678", "PASSPORT");
  assert.ok(passportFinding, "PASSPORT matching failed");
  assert.strictEqual(passportFinding.confidence, 0.85);

  // IP Address
  const ipFinding = getFinding("Ping 192.168.1.1", "IP_ADDRESS");
  assert.ok(ipFinding, "IP_ADDRESS matching failed");
  assert.strictEqual(ipFinding.confidence, 0.85);
}

// 2. Financial Rules Validation
{
  // Card (Luhn check passing)
  const cardFinding = getFinding("Mastercard number 4111 1111 1111 1111", "CARD");
  assert.ok(cardFinding, "CARD matching failed");
  assert.strictEqual(cardFinding.confidence, 0.9);
  assert.strictEqual(cardFinding.severity, "critical");

  // Bank Account (IBAN)
  const ibanFinding = getFinding("IBAN is DE89370400440532013000", "BANK_ACCOUNT");
  assert.ok(ibanFinding, "BANK_ACCOUNT matching failed");
  assert.strictEqual(ibanFinding.confidence, 0.9);

  // Mpesa
  const mpesaFinding = getFinding("Transaction receipt: LHS427GH89", "MPESA");
  assert.ok(mpesaFinding, "MPESA matching failed");
  assert.strictEqual(mpesaFinding.confidence, 0.8);
}

// 3. Secrets / API Keys Rules Validation
{
  // OpenAI
  const openaiFinding = getFinding("OpenAI: sk-proj-1234567890abcdefghijklmnopqrstuvwxyz", "API_KEY_OPENAI");
  assert.ok(openaiFinding, "API_KEY_OPENAI matching failed");
  assert.strictEqual(openaiFinding.confidence, 0.95);

  // Anthropic
  const anthropicFinding = getFinding("Anthropic: sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz", "API_KEY_OPENAI"); // Matches OpenAI rule due to overlap, which is the current engine behavior
  assert.ok(anthropicFinding, "Anthropic overlap scan failed");

  // Stripe
  const stripeFinding = getFinding("Stripe: sk_test_1234567890abcdefghijklmnopqrstuvwxyz", "API_KEY_STRIPE");
  assert.ok(stripeFinding, "API_KEY_STRIPE matching failed");
  assert.strictEqual(stripeFinding.confidence, 0.95);

  // GitHub
  const githubFinding = getFinding("GitHub: ghp_1234567890abcdefghijklmnopqrstuvwxyz123456", "API_KEY_GITHUB");
  assert.ok(githubFinding, "API_KEY_GITHUB matching failed");
  assert.strictEqual(githubFinding.confidence, 0.95);

  // AWS Access Key
  const awsAccessFinding = getFinding("AWS Access Key: AKIAIOSFODNN7EXAMPLE", "API_KEY_AWS_ACCESS");
  assert.ok(awsAccessFinding, "API_KEY_AWS_ACCESS matching failed");
  assert.strictEqual(awsAccessFinding.confidence, 0.95);

  // AWS Secret Key
  const awsSecretFinding = getFinding("AWS_SECRET_ACCESS_KEY=1234567890abcdefghijklmnopqrstuvwx/+=40chars", "API_KEY_AWS_SECRET");
  assert.ok(awsSecretFinding, "API_KEY_AWS_SECRET matching failed");
  assert.strictEqual(awsSecretFinding.confidence, 0.95);

  // GCP Key
  const gcpFinding = getFinding("GCP key AIzaSyAbcdefghijklmnopqrstuvwxyz1234567", "API_KEY_GCP");
  assert.ok(gcpFinding, "API_KEY_GCP matching failed");

  // Azure Connection String
  const azureFinding = getFinding("DefaultEndpointsProtocol=https;AccountName=myacc;AccountKey=abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl=;", "API_KEY_AZURE_CONN");
  assert.ok(azureFinding, "API_KEY_AZURE_CONN matching failed");
}

console.log("rule-regression.test.js passed!");
