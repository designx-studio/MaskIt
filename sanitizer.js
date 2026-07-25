function getRedactionText(type, settings) {
  const format = settings.redactFormat || "tagged";

  if (format === "stars") return "***";
  if (format === "custom") {
    return settings.customRedactText || "[REDACTED]";
  }

  const label = String(type).replace(/^CUSTOM:/, "");
  return `[${label}_REDACTED]`;
}

function sanitizeText(text, findings, settings) {
  const config = settings || MASKIT_DEFAULTS;
  let sanitized = text;

  findings.forEach((item) => {
    sanitized = sanitized.replaceAll(
      item.value,
      getRedactionText(item.type, config)
    );
  });

  return sanitized;
}
