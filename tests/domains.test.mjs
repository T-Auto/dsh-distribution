import test from 'node:test';
import assert from 'node:assert/strict';
import { validateComposition } from '../packages/composition/lib/index.js';
import { validateLayout } from '../packages/layout/lib/index.js';
import { definition as lifecycle, advanceObservation } from '../packages/lifecycle/lib/index.js';
import { definition as portability, createMigrationPlan, validatePlan, validateRequest, advanceMigration, migrationStates, transitions } from '../packages/portability/lib/index.js';
import { layout, request, journal, change } from './fixtures.mjs';
test('COMP DAG accepts opaque references without loading code', () => {
  assert.equal(validateComposition({ components: [{ id: 'a', ref: 'pkg:npm/example@1' }, { id: 'b', ref: 'oci://example/b', dependsOn: ['a'] }] }).ok, true);
});
for (const [name, components] of Object.entries({ duplicate: [{ id: 'a', ref: 'urn:a' }, { id: 'a', ref: 'urn:b' }], missing: [{ id: 'a', ref: 'urn:a', dependsOn: ['b'] }], self: [{ id: 'a', ref: 'urn:a', dependsOn: ['a'] }], cycle: [{ id: 'a', ref: 'urn:a', dependsOn: ['b'] }, { id: 'b', ref: 'urn:b', dependsOn: ['a'] }] })) test(`COMP rejects ${name}`, () => assert.equal(validateComposition({ components }).ok, false));
for (const path of ['../escape', './a/../secret', '/absolute', 'C:\\data', './a\\b', './%2e%2e/secret', './a//b', './a/', './CON', './com1.txt', './a.', './a/./b', './a\u0000b', './safe\n', './safe\r\n']) test(`LAYOUT rejects path ${JSON.stringify(path)}`, () => assert.equal(validateLayout(change(layout, l => { l.resources[0].location.value = path; })).ok, false));
test('LAYOUT external boundary, secret labeling and uniqueness enforced', () => {
  assert.equal(validateLayout(layout).ok, true);
  assert.equal(validateLayout(change(layout, l => { l.resources[0].ownership = 'external'; })).ok, false);
  assert.equal(validateLayout(change(layout, l => { l.resources.at(-1).sensitivity = 'public'; })).ok, false);
  assert.equal(validateLayout(change(layout, l => l.resources.push(l.resources[0]))).ok, false);
});
test('LIFE observations can skip states but not revisions or instance identity', () => {
  const prev = { apiVersion: 'lifecycle.distribution.dsh.dev/v1alpha1', kind: 'EnvironmentObservation', instanceId: 'urn:test:a', revision: 2, state: 'declared' };
  assert.equal(advanceObservation(prev, { ...prev, revision: 7, state: 'active' }, 2).ok, true);
  assert.equal(advanceObservation(prev, { ...prev, revision: 7 }, 1).ok, false);
  assert.equal(advanceObservation(prev, prev, 2).ok, false);
  assert.equal(advanceObservation(prev, { ...prev, revision: 7, instanceId: 'urn:test:b' }, 2).ok, false);
  assert.equal(lifecycle.validate({ states: [] }).ok, false);
  assert.equal(lifecycle.validate({ states: ['active', 'active'] }).ok, false);
});
test('PORT modes are nonempty and unique', () => {
  assert.equal(portability.validate({ modes: [] }).ok, false);
  assert.equal(portability.validate({ modes: ['clone', 'clone'] }).ok, false);
  assert.equal(portability.validate({ modes: ['activate'] }).ok, false);
  assert.equal(portability.validate({ modes: ['clone', 'export', 'migrate'] }).ok, true);
});
test('PORT plan is deterministic, nonmutating and secret-safe', () => {
  const before = structuredClone({ layout, request });
  const a = createMigrationPlan(layout, request); assert.equal(a.ok, true); assert.equal(a.value.ready, true);
  assert.deepEqual(a, createMigrationPlan(layout, request)); assert.deepEqual({ layout, request }, before);
  assert.equal(validatePlan(a.value).ok, true);
  assert.deepEqual(Object.fromEntries(a.value.entries.map(e => [e.resourceId, e.action])), { config: 'copy', extensions: 'copy', state: 'copy', data: 'reference', cache: 'skip', credentials: 'skip' });
});
test('PORT conditional resources require approval; shared resources never copied', () => {
  const blocked = createMigrationPlan(layout, { ...request, approvedConditionalResources: [] }); assert.equal(blocked.value.ready, false);
  const shared = createMigrationPlan(change(layout, l => { l.resources[0].ownership = 'shared'; }), request);
  assert.equal(shared.value.entries[0].action, 'reference');
  assert.equal(createMigrationPlan(layout, { ...request, approvedConditionalResources: ['missing'] }).ok, false);
  assert.equal(validateRequest({ ...request, targetInstanceId: request.sourceInstanceId }).ok, false);
});
test('PORT blocks relative overlaps including case-folded secret descendants', () => {
  const nested = change(layout, l => { l.resources.at(-1).location = { type: 'relative-path', value: './SETTINGS/private' }; });
  const result = createMigrationPlan(nested, request);
  assert.equal(result.value.ready, false); assert.equal(result.value.entries[0].reason, 'OVERLAPPING_LOCATION');
});
test('PORT overlapping exact URI is blocked', () => {
  const l = change(layout, l => { l.resources[0].location = { ...l.resources.at(-1).location }; });
  assert.equal(createMigrationPlan(l, request).value.entries[0].action, 'blocked');
});
test('PORT forged plan readiness and action/reason rejected', () => {
  const plan = createMigrationPlan(layout, request).value;
  assert.equal(validatePlan(change(plan, p => { p.ready = false; })).ok, false);
  assert.equal(validatePlan(change(plan, p => { p.entries[0].reason = 'SECRET_EXCLUDED'; })).ok, false);
  assert.equal(validatePlan(change(plan, p => { p.request.approvedConditionalResources = []; })).ok, false);
});
test('PORT all journal transition pairs conform to explicit graph', () => {
  for (const from of migrationStates) for (const to of migrationStates) {
    const result = advanceMigration({ ...journal, state: from }, to, 0);
    assert.equal(result.ok, transitions[from].includes(to), `${from} -> ${to}`);
    if (result.ok) assert.equal(result.value.revision, 1);
  }
});
test('PORT rollback failure remains visible and retryable; stale revisions rejected', () => {
  let current = journal;
  for (const state of ['prepared', 'copying', 'failed', 'rolling-back', 'rollback-failed', 'rolling-back', 'rolled-back']) {
    const result = advanceMigration(current, state, current.revision); assert.equal(result.ok, true); current = result.value;
  }
  assert.equal(advanceMigration(journal, 'prepared', 9).ok, false);
  assert.equal(advanceMigration({ ...journal, revision: Number.MAX_SAFE_INTEGER }, 'prepared', Number.MAX_SAFE_INTEGER).ok, false);
});
