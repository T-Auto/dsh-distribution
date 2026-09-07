import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  coordinate, entrySchema, validateEntry, validateLodgement, visibleEntries,
  canTransitionStatus, publishEntry, removeEntry, MemoryLodgement,
  canDeleteLodgementCarrier, implementationEvidence,
} from '../packages/lodgement/lib/index.js';
import { schemaDocument, validate } from '../packages/core/lib/index.js';
import Ajv2020 from 'ajv/dist/2020.js';

const entry = {
  apiVersion: coordinate.apiVersion, kind: 'DiscoverableEntry', instanceId: 'urn:test:instance:one',
  distribution: { id: 'urn:test:dist:one', version: '1' }, descriptorRef: 'urn:test:descriptor:one',
  revision: 0, contentDigest: 'sha256:one', publisher: 'urn:test:publisher:one', status: 'published',
};
const removed = { ...entry, instanceId: 'urn:test:instance:removed', status: 'removed' };
const lodgement = { ...coordinate, entries: [entry, removed] };
const change = (value, mutate) => { const copy = structuredClone(value); mutate(copy); return copy; };

test('LOD structure uses closed fields, URI instanceId, nonnegative revision and required digest', () => {
  assert.equal(validateEntry(change(entry, value => { value.unknown = true; })).ok, false);
  assert.equal(validateEntry(change(entry, value => { value.instanceId = 'relative'; })).ok, false);
  assert.equal(validateEntry(change(entry, value => { value.revision = -1; })).ok, false);
  assert.equal(validateEntry(change(entry, value => { delete value.contentDigest; })).ok, false);
  const ajv = new Ajv2020({ strict: true });
  const check = ajv.compile(schemaDocument('lodgement/entry', entrySchema));
  assert.equal(check(entry), true);
  assert.equal(check(change(entry, value => { value.unknown = true; })), false);
});

test('LOD duplicate instanceId is rejected semantically', () => {
  const result = validateLodgement({ ...coordinate, entries: [entry, entry] });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'DUPLICATE_INSTANCE_ID'));
});

test('LOD published to removed state machine and removed entries are ignored', () => {
  assert.equal(canTransitionStatus('published', 'removed'), true);
  assert.equal(canTransitionStatus('removed', 'published'), false);
  assert.equal(publishEntry(entry).ok, true);
  assert.equal(publishEntry(removed).ok, false);
  assert.equal(visibleEntries(lodgement).length, 1);
  assert.equal(visibleEntries(lodgement, () => false).length, 0);
});

test('LOD staged half-write is not visible until commit and committed snapshots detach', () => {
  const manager = new MemoryLodgement();
  assert.equal(manager.stage(entry).ok, true);
  assert.equal(manager.visible().length, 0);
  assert.equal(manager.commit(entry.instanceId).ok, true);
  const snapshot = manager.visible();
  assert.equal(snapshot.length, 1);
  snapshot[0].displayName = 'mutated';
  assert.equal(manager.visible()[0].displayName, undefined);
  assert.equal(manager.stage(entry).ok, false);
});

test('LOD removal requires publisher or authorization and preserves shared carrier', () => {
  assert.equal(removeEntry(entry, 'urn:test:other').ok, false);
  assert.equal(removeEntry(entry, entry.publisher).value.status, 'removed');
  assert.equal(removeEntry(entry, 'urn:test:authorized', ['urn:test:authorized']).value.status, 'removed');
  const manager = new MemoryLodgement([entry]);
  assert.equal(manager.remove(entry.instanceId, 'urn:test:other').ok, false);
  assert.equal(manager.remove(entry.instanceId, entry.publisher).value.status, 'removed');
  assert.equal(manager.visible().length, 0);
  assert.equal(canDeleteLodgementCarrier(), false);
});

test('LOD fixtures load as JSON and identify implementation evidence as not-tested', async () => {
  const fixtures = JSON.parse(await readFile('conformance/fixtures/lodgement.json', 'utf8'));
  assert.equal(fixtures.length, 3);
  assert.ok(fixtures.some(fixture => fixture.id === 'half-written' && fixture.valid === false));
  assert.equal(implementationEvidence.filesystemTransactions, 'not-tested');
  assert.equal(implementationEvidence.persistentGlobalUniqueness, 'not-tested');
  assert.equal(implementationEvidence.sourceAuthentication, 'not-tested');
});
