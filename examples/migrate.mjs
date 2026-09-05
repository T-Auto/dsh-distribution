import { readFile } from 'node:fs/promises';
import { createMigrationPlan, advanceMigration } from '../packages/portability/lib/index.js';
const descriptor = JSON.parse(await readFile(new URL('./managed.json', import.meta.url), 'utf8'));
const layout = descriptor.protocols.find(row => row.kind === 'ManagedLayout').spec;
const plan = createMigrationPlan(layout, {
  planId: 'urn:example:plan:1', mode: 'clone', sourceInstanceId: 'urn:example:instance:a',
  targetInstanceId: 'urn:example:instance:b', sourceRevision: 0,
  approvedConditionalResources: ['state'],
  rollback: { strategy: 'discard-new-target', reference: 'urn:example:staging:b' },
});
if (!plan.ok || !plan.value.ready) throw new Error(JSON.stringify(plan));
const journal = { apiVersion: 'portability.distribution.dsh.dev/v1alpha1', kind: 'MigrationJournal', planId: plan.value.request.planId, revision: 0, state: 'planned' };
const failed = advanceMigration(journal, 'failed', 0);
if (!failed.ok) throw new Error('Journal example failed');
console.log('Migration dry-run:', plan.value.entries.map(row => `${row.resourceId}=${row.action}`).join(', '));
console.log('No files copied, no credentials exported, no source deleted; journal is bookkeeping only.');
