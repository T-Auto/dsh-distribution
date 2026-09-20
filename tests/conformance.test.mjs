import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { validate, schemaDocument } from '../packages/core/lib/index.js';
import { validateComposition } from '../packages/composition/lib/index.js';
import { validateLayout } from '../packages/layout/lib/index.js';
import { definition as discovery, validateInstance, validateResolution } from '../packages/discovery/lib/index.js';
import { definition as lifecycle, validateObservation } from '../packages/lifecycle/lib/index.js';
import { definition as portability, validateRequest, validateJournal } from '../packages/portability/lib/index.js';
import { validateEntry, validateLodgement } from '../packages/lodgement/lib/index.js';
import { schemas } from '../scripts/schemas.mjs';

const DIRECTORY = 'conformance/fixtures';
const validators = {
  validateComposition, validateLayout, validateInstance, validateResolution, validateObservation,
  validateRequest, validateJournal, validateEntry, validateLodgement,
  definitionEnvironmentDiscovery: discovery.validate,
  definitionEnvironmentLifecycle: lifecycle.validate,
  definitionEnvironmentPortability: portability.validate,
};

// `descriptors.json` and `lodgement.json` predate the `schema`/`validate` fields and keep their own
// dedicated tests (tests/core.test.mjs, tests/lodgement.test.mjs). Every other fixture must address
// its validator by name, so it is checked against the real implementation instead of prose.
const files = (await readdir(DIRECTORY)).filter(name => name.endsWith('.json') && !['descriptors.json', 'lodgement.json'].includes(name));

for (const file of files) {
  const rows = JSON.parse(await readFile(join(DIRECTORY, file), 'utf8'));
  test(`FIXTURES ${file}: every vector is addressed and agrees with its validator`, () => {
    assert.ok(rows.length > 0, `${file} must contain at least one vector`);
    for (const row of rows) {
      assert.ok(row.id && row.validate && row.schema, `${file}: vector needs id, schema and validate`);
      assert.ok(Object.hasOwn(validators, row.validate), `${file}:${row.id}: unknown validator ${row.validate}`);
      assert.ok(Object.hasOwn(schemas, row.schema), `${file}:${row.id}: unknown schema ${row.schema}`);
      const result = validators[row.validate](row.document);
      assert.equal(result.ok, row.valid, `${file}:${row.id}: expected valid=${row.valid}, got ${JSON.stringify(result.issues ?? result.value)}`);
      if (row.valid === false) {
        assert.ok(result.issues.length > 0, `${file}:${row.id}: a rejected vector must carry an issue`);
        if (row.code) assert.ok(result.issues.some(issue => issue.code === row.code), `${file}:${row.id}: expected code ${row.code}, got ${result.issues.map(i => i.code).join(', ')}`);
      }
    }
  });
}

test('FIXTURES structural rejection and validator rejection agree unless declared', async () => {
  // One expectation per fixture family: the JSON Schema and the semantic validator must agree on
  // rejection. Divergences are allowed only where the proposal declares them (LAYOUT-02 platform
  // aliases, LOD-03 digest length); this test pins them so they cannot drift silently.
  const expectations = [
    ['layout', 'path-parent-escape', false, false],
    ['layout', 'path-windows-device-name', true, false],
    ['portability', 'request-same-source-and-target', true, false],
  ];
  const cache = new Map();
  for (const [file, id, schemaAccepts, validatorAccepts] of expectations) {
    if (!cache.has(file)) cache.set(file, JSON.parse(await readFile(join(DIRECTORY, `${file}.json`), 'utf8')));
    const vector = cache.get(file).find(row => row.id === id);
    assert.ok(vector, `${file}:${id}: vector missing`);
    const structural = validate(schemas[vector.schema], vector.document).ok;
    const semantic = validators[vector.validate](vector.document).ok;
    assert.equal(structural, schemaAccepts, `${file}:${id}: structural expectation`);
    assert.equal(semantic, validatorAccepts, `${file}:${id}: semantic expectation`);
  }
});
