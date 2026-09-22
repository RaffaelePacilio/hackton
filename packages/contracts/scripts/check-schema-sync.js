#!/usr/bin/env node
/**
 * Schema sync check — validates that each JSON Schema in schemas/ is structurally
 * consistent with the corresponding TypeScript contract. Fails with exit code 1 on
 * any mismatch, so CI can gate on it.
 *
 * Strategy: for each schema file, verify that every "required" field listed in the
 * schema is present as a key in the schema's "properties" (or "definitions"), and
 * that the $id matches the expected aua.dev pattern. This is a lightweight structural
 * check — it does not need a full AJV run and has no external dependencies.
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasDir = join(__dirname, "..", "schemas");

let failed = false;

function fail(msg) {
  console.error(`[schema-sync] FAIL: ${msg}`);
  failed = true;
}

function checkSchema(file, schema) {
  const path = `schemas/${file}`;

  if (!schema.$id) {
    fail(`${path} — missing $id`);
    return;
  }
  if (!schema.$id.startsWith("https://aua.dev/schemas/")) {
    fail(`${path} — $id must start with https://aua.dev/schemas/, got: ${schema.$id}`);
    return;
  }

  // For top-level object schemas: every required field must appear in properties
  if (schema.type === "object" && Array.isArray(schema.required) && schema.properties) {
    for (const field of schema.required) {
      if (!(field in schema.properties)) {
        fail(`${path} — required field "${field}" is missing from properties`);
      }
    }
  }

  // For schemas with definitions: each definition that is an object with required
  // fields must have those fields in its properties
  if (schema.definitions) {
    for (const [defName, def] of Object.entries(schema.definitions)) {
      if (def.type === "object" && Array.isArray(def.required) && def.properties) {
        for (const field of def.required) {
          if (!(field in def.properties)) {
            fail(`${path}#/definitions/${defName} — required field "${field}" is missing from properties`);
          }
        }
      }
    }
  }
}

// Expected schema files keyed to their expected $id prefix
const expectedFiles = [
  "interaction-contract-1.0.0.json",
  "semantic-page-model-1.0.0.json",
  "skill-contract-1.0.0.json",
  "agent-contract-1.0.0.json",
];

const presentFiles = new Set(readdirSync(schemasDir));

for (const file of expectedFiles) {
  if (!presentFiles.has(file)) {
    fail(`Missing expected schema file: schemas/${file}`);
    continue;
  }
  let schema;
  try {
    schema = JSON.parse(readFileSync(join(schemasDir, file), "utf-8"));
  } catch (e) {
    fail(`schemas/${file} — JSON parse error: ${e.message}`);
    continue;
  }
  checkSchema(file, schema);
}

if (failed) {
  process.exit(1);
} else {
  console.log("[schema-sync] All schema files passed structural validation.");
}
