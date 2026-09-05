import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import { schemas } from '../scripts/schemas.mjs';
import { validate, schemaDocument } from '../packages/core/lib/index.js';
import { bindInstance } from '../packages/discovery/lib/index.js';
import { checkDescriptor } from '../packages/conformance/lib/index.js';
import { createMigrationPlan } from '../packages/portability/lib/index.js';
import { managed, minimal, layout, request, journal } from './fixtures.mjs';
const reference = 'urn:test:descriptor:1';
const instance = bindInstance(minimal, 'urn:test:instance:1', reference).value;
const values = {
  'core/descriptor': managed,
  'composition/composition': managed.protocols[0].spec,
  'layout/layout': layout,
  'discovery/discovery': { references: [reference] },
  'discovery/instance': instance,
  'discovery/resolution': { reference, descriptor: minimal, instance },
  'lifecycle/lifecycle': { states: ['active'] },
  'lifecycle/observation': { apiVersion: 'lifecycle.distribution.dsh.dev/v1alpha1', kind: 'EnvironmentObservation', instanceId: instance.instanceId, revision: 1, state: 'active' },
  'portability/portability': { modes: ['clone'] }, 'portability/request': request,
  'portability/plan': createMigrationPlan(layout, request).value, 'portability/journal': journal,
};
for (const [name, schema] of Object.entries(schemas)) test(`SCHEMA ${name}: independent Ajv agrees with structural validator`, () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const check = ajv.compile(schemaDocument(name, schema));
  const good = values[name]; assert.equal(check(good), true, JSON.stringify(check.errors));
  const samples = [good, null, [], true, 1, '', {}, { ...good, unknown: 1 }];
  for (const key of Object.keys(good)) {
    const missing = structuredClone(good); delete missing[key]; samples.push(missing);
    for (const invalid of [null, false, 3.2, '', [], {}]) samples.push({ ...good, [key]: invalid });
  }
  for (const sample of samples) assert.equal(validate(schema, sample).ok, check(sample), `${name}: ${JSON.stringify(sample)}`);
});
test('DOCS linked environment examples pass complete descriptor validation', async () => {
  for (const path of ['README.md', 'docs/getting-started.md']) {
    const text = await readFile(path, 'utf8');
    const links = [...text.matchAll(/\]\(([^)]+\.json)\)/g)];
    assert.ok(links.length > 0, `${path} should link a machine-readable environment example`);
    for (const [, target] of links) {
      const file = resolve(dirname(path), target);
      const descriptor = JSON.parse(await readFile(file, 'utf8'));
      assert.equal(checkDescriptor(descriptor).complete, true, target);
    }
  }
});
test('CLI bounded read-only JSON reports and all exit statuses', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-distribution-test-'));
  const cli = resolve('packages/conformance/lib/cli.js');
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  try {
    assert.equal(run('--help').status, 0); assert.equal(run().status, 2);
    assert.equal(run(join(dir, 'missing.json')).status, 2);
    assert.equal(run(dir).status, 2);
    for (const [name, value, status] of [
      ['valid', JSON.stringify(managed), 0], ['invalid', '{}', 1], ['broken', '{', 2],
      ['large', ' '.repeat(1024 * 1024 + 1), 2],
      ['unknown', JSON.stringify({ ...minimal, protocols: [{ apiVersion: 'private.example/v1', kind: 'Custom', required: false, spec: {} }] }), 3],
    ]) {
      const path = join(dir, `${name}.json`); await writeFile(path, value);
      const result = run(path); assert.equal(result.status, status, result.stderr); assert.equal(typeof JSON.parse(result.stdout).valid, 'boolean');
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
