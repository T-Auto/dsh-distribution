import { readFileSync } from 'node:fs';
export const managed = JSON.parse(readFileSync(new URL('../examples/managed.json', import.meta.url), 'utf8'));
export const minimal = JSON.parse(readFileSync(new URL('../examples/minimal.json', import.meta.url), 'utf8'));
export const layout = managed.protocols.find(row => row.kind === 'ManagedLayout').spec;
export const request = {
  planId: 'urn:test:plan:1', mode: 'clone', sourceInstanceId: 'urn:test:instance:a', targetInstanceId: 'urn:test:instance:b',
  sourceRevision: 4, approvedConditionalResources: ['state'],
  rollback: { strategy: 'discard-new-target', reference: 'urn:test:staging:b' },
};
export const journal = { apiVersion: 'portability.distribution.dsh.dev/v1alpha1', kind: 'MigrationJournal', planId: request.planId, revision: 0, state: 'planned' };
export const change = (value, mutate) => { const copy = structuredClone(value); mutate(copy); return copy; };
