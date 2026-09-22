#!/usr/bin/env node
// Build-time validator: ensures every registry/*.json conforms to the SkillDefinition schema
// and satisfies ADR-014 security constraints. Exits 1 if any entry fails.
import Ajv from "ajv";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryDir = join(__dirname, "..", "registry");
const schemaPath = join(__dirname, "..", "schemas", "skill-definition.schema.json");

const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

// ADR-014: AUTHENTICATE/PAYMENT/DESTRUCTIVE must have explicit rollback
const HIGH_RISK_CLASSES = new Set(["AUTHENTICATE", "PAYMENT", "DESTRUCTIVE"]);

let passed = 0;
let failed = 0;

const files = readdirSync(registryDir).filter((f) => f.endsWith(".json"));

if (files.length === 0) {
  console.log("No registry files found — nothing to validate.");
  process.exit(0);
}

for (const file of files.sort()) {
  const filePath = join(registryDir, file);
  const stem = basename(file, ".json");
  const errors = [];

  let data;
  try {
    data = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (e) {
    errors.push(`JSON parse error: ${e.message}`);
    console.error(`FAIL ${file}`);
    for (const err of errors) console.error(`     ${err}`);
    failed++;
    continue;
  }

  // Schema validation
  if (!validate(data)) {
    for (const err of validate.errors ?? []) {
      errors.push(`Schema: ${err.instancePath || "/"} ${err.message}`);
    }
  }

  // Filename must match id field
  if (data.id !== undefined && data.id !== stem) {
    errors.push(
      `id mismatch: file is "${stem}.json" but id field is "${data.id}"`
    );
  }

  // ADR-014: AUTHENTICATE/PAYMENT/DESTRUCTIVE require explicit rollback
  if (
    data.securityClassification !== undefined &&
    HIGH_RISK_CLASSES.has(data.securityClassification) &&
    data.rollback === "not-applicable"
  ) {
    errors.push(
      `ADR-014 violation: securityClassification "${data.securityClassification}" requires rollback "supported" or "manual-only", not "not-applicable"`
    );
  }

  if (errors.length === 0) {
    console.log(`PASS ${file}`);
    passed++;
  } else {
    console.error(`FAIL ${file}`);
    for (const err of errors) console.error(`     ${err}`);
    failed++;
  }
}

console.log(`\nRegistry validation: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
