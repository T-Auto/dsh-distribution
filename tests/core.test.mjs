import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ProtocolCatalog, assessCompatibility, validateDescriptor, uriSchema, s, validate } from '../packages/core/lib/index.js';
import { createPublicCatalog, checkDescriptor, supportedPublicCoordinates } from '../packages/conformance/lib/index.js';
import { minimal, managed, change } from './fixtures.mjs';
const fixtures = JSON.parse(readFileSync(new URL('../conformance/fixtures/descriptors.json', import.meta.url), 'utf8'));
for (const fixture of fixtures) test(`CORE fixture: ${fixture.id}`, () => {
  const report = checkDescriptor(fixture.document);
  assert.equal(report.valid, fixture.valid); assert.equal(report.complete, fixture.complete);
  if (fixture.code) assert.ok(report.issues.some(i => i.code === fixture.code));
});
test('CORE managed example checks without runtime imports', () => assert.equal(checkDescriptor(managed).complete, true));
test('CORE catalog knowledge is not support', () => {
  assert.equal(assessCompatibility(managed, createPublicCatalog(), []).compatible, false);
  assert.equal(assessCompatibility(managed, createPublicCatalog(), supportedPublicCoordinates()).compatible, true);
});
test('CORE unknown required fails; optional remains inspectable', () => {
  for (const required of [true, false]) {
    const doc = change(minimal, d => d.protocols.push({ apiVersion: 'private.example/v1', kind: 'Custom', required, spec: {} }));
    assert.equal(assessCompatibility(doc, new ProtocolCatalog(), []).compatible, !required);
    assert.equal(checkDescriptor(doc).complete, false);
  }
});
test('CORE private protocol uses same dispatch; versions match exactly', () => {
  const schema = s.object({ answer: s.integer });
  const identity = { apiVersion: 'private.example/v2', kind: 'Answer' };
  const catalog = new ProtocolCatalog().register({ ...identity, validate: value => validate(schema, value) });
  assert.throws(() => catalog.register({ ...identity, validate: value => validate(schema, value) }), /Duplicate/);
  const doc = change(minimal, d => d.protocols.push({ ...identity, required: true, spec: { answer: 42 } }));
  assert.equal(assessCompatibility(doc, catalog, [identity]).compatible, true);
  assert.equal(assessCompatibility(doc, catalog, [{ ...identity, apiVersion: 'private.example/v1' }]).compatible, false);
  assert.equal(checkDescriptor(doc, catalog).complete, true);
  doc.protocols[0].spec.answer = '42'; assert.equal(checkDescriptor(doc, catalog).valid, false);
});
test('CORE unknown fields, wrong coordinates, non-JSON and inherited input rejected', () => {
  for (const value of [null, [], new Date(), { ...minimal, arbitrary: 1 }, { ...minimal, protocols: undefined }, change(minimal, d => { d.protocols = [{ apiVersion: 'not-a-version', kind: 'x', required: true, spec: null }]; })]) assert.equal(validateDescriptor(value).ok, false);
  const cyclic = { ...minimal }; cyclic.protocols = [cyclic]; assert.equal(validateDescriptor(cyclic).ok, false);
  assert.equal(validate(s.json, NaN).ok, false);
  assert.equal(validate(s.json, Array(1)).ok, false);
  assert.equal(validateDescriptor(Object.create(minimal)).ok, false);
  let nested = {};
  for (let i = 0; i < 1000; i++) nested = { child: nested };
  assert.equal(validate(s.json, nested).ok, false);
});
test('CORE URI references reject control characters and trailing newline', () => {
  for (const uri of ['urn:test:x\n', 'urn:test:x\u0000', 'urn:test:x\u007f']) assert.equal(validate(uriSchema, uri).ok, false);
});
test('CORE throwing definitions fail closed without leaking provider exception', () => {
  const coordinate = { apiVersion: 'private.example/v1', kind: 'Throwing' };
  const catalog = new ProtocolCatalog().register({ ...coordinate, validate() { throw new Error('SECRET'); } });
  const doc = change(minimal, d => d.protocols.push({ ...coordinate, required: false, spec: {} }));
  const report = assessCompatibility(doc, catalog, [coordinate]);
  assert.equal(report.compatible, false); assert.equal(JSON.stringify(report).includes('SECRET'), false);
  assert.equal(checkDescriptor(doc, catalog).valid, false);
});
test('CORE invalid and duplicate supported coordinates fail closed', () => {
  assert.equal(assessCompatibility(minimal, new ProtocolCatalog(), [{ apiVersion: 'bad', kind: 'Bad' }]).compatible, false);
  const row = { apiVersion: 'private.example/v1', kind: 'Custom' };
  assert.equal(assessCompatibility(minimal, new ProtocolCatalog(), [row, row]).compatible, false);
});
