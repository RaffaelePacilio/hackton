import type { AuaSpan } from "./span-schema.js";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateSpanBeforeIngestion(
  span: AuaSpan,
  sensitiveElementIds: Set<string>
): ValidationResult {
  const elementId = span.attributes["aua.element_id"];
  if (typeof elementId === "string" && sensitiveElementIds.has(elementId)) {
    if (span.attributes["aua.redacted"] !== true) {
      return { valid: false, reason: "sensitive-element-not-redacted" };
    }
  }

  for (const key of Object.keys(span.attributes)) {
    if (key.endsWith("_value") || key.endsWith("_content")) {
      return { valid: false, reason: "potential-content-leak" };
    }
  }

  return { valid: true };
}
