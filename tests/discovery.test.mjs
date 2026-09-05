import test from 'node:test';
import assert from 'node:assert/strict';
import { bindInstance, validateResolution, MemoryDiscoveryProvider, discover } from '../packages/discovery/lib/index.js';
import { minimal, change } from './fixtures.mjs';
const reference = 'urn:test:descriptor:1';
const instance = bindInstance(minimal, 'urn:test:instance:1', reference).value;
const resolution = { reference, descriptor: minimal, instance };
test('DISC separate installations preserve distribution identity and separate instance IDs', () => {
  const second = bindInstance(minimal, 'urn:test:instance:2', reference).value;
  assert.deepEqual(instance.distribution, second.distribution); assert.notEqual(instance.instanceId, second.instanceId);
});
test('DISC resolution validates instance binding and descriptor semantics', () => {
  assert.equal(validateResolution(resolution).ok, true);
  assert.equal(validateResolution(change(resolution, r => { r.instance.distribution.version = 'other'; })).ok, false);
  assert.equal(validateResolution(change(resolution, r => { r.instance.descriptorRef = 'urn:other'; })).ok, false);
  assert.equal(validateResolution(change(resolution, r => { r.descriptor.protocols = [1]; })).ok, false);
});
test('DISC memory provider is read-only and returns detached snapshots', async () => {
  const entry = structuredClone(resolution); const provider = new MemoryDiscoveryProvider([entry]);
  entry.descriptor.distribution.version = 'mutated';
  const result = await discover(reference, provider); assert.equal(result.ok, true);
  assert.equal(result.value.descriptor.distribution.version, minimal.distribution.version);
  result.value.descriptor.distribution.version = 'mutated-again';
  assert.equal((await discover(reference, provider)).value.descriptor.distribution.version, minimal.distribution.version);
  assert.throws(() => new MemoryDiscoveryProvider([resolution, resolution]), /duplicate/);
});
test('DISC distinguishes not-found, provider error, invalid and mismatched result', async () => {
  for (const [provider, code] of [
    [{ resolve: async () => undefined }, 'NOT_FOUND'],
    [{ resolve: async () => { throw new Error('secret-token'); } }, 'PROVIDER_ERROR'],
    [{ resolve: async () => ({}) }, 'SCHEMA_INVALID'],
    [{ resolve: async () => ({ reference: 'urn:wrong', descriptor: minimal }) }, 'REFERENCE_MISMATCH'],
  ]) { const result = await discover(reference, provider); assert.equal(result.ok, false); assert.equal(result.issues[0].code, code); assert.equal(JSON.stringify(result).includes('secret-token'), false); }
});
test('DISC timeout settles even when provider ignores abort', async () => {
  let signal;
  const result = await discover(reference, { resolve: (_, ctx) => { signal = ctx.signal; return new Promise(() => {}); } }, { timeoutMs: 10 });
  assert.equal(result.issues[0].code, 'TIMEOUT'); assert.equal(signal.aborted, true);
});
test('DISC abort before call or during IO', async () => {
  const controller = new AbortController(); controller.abort();
  assert.equal((await discover(reference, { resolve() { assert.fail('Must not run'); } }, { signal: controller.signal })).issues[0].code, 'ABORTED');
  const mid = new AbortController();
  const promise = discover(reference, { resolve: async () => { mid.abort(); return resolution; } }, { signal: mid.signal });
  assert.equal((await promise).issues[0].code, 'ABORTED');
});
test('DISC rejects invalid options and references before invoking provider', async () => {
  const provider = { resolve() { assert.fail('Must not run'); } };
  assert.equal((await discover('./relative', provider)).issues[0].code, 'INVALID_REFERENCE');
  for (const timeoutMs of [0, -1, NaN, Infinity, 2147483648]) assert.equal((await discover(reference, provider, { timeoutMs })).issues[0].code, 'INVALID_TIMEOUT');
});
