import { s, uriSchema, idSchema, validate, unique, issue, type Infer, type Result, type ProtocolDefinition, type Issue } from '@dsh-distribution/core';
import { validateLayout, type ManagedLayout } from '@dsh-distribution/layout';
export const coordinate = { apiVersion: 'portability.distribution.dsh.dev/v1alpha1', kind: 'EnvironmentPortability' } as const;
export const portabilitySchema = s.object({ modes: s.array(s.enum('clone', 'export', 'migrate')) });
export type EnvironmentPortability = Infer<typeof portabilitySchema>;
export const definition: ProtocolDefinition<EnvironmentPortability> = { ...coordinate, validate: value => validate(portabilitySchema, value, (v, e) => {
  unique(v.modes, mode => mode, '/modes', e);
  if (v.modes.length === 0) issue(e, 'INVALID_MODES', '/modes', 'At least one mode is required');
}) };
export const requestSchema = s.object({
  planId: uriSchema, mode: s.enum('clone', 'export', 'migrate'),
  sourceInstanceId: uriSchema, targetInstanceId: uriSchema, sourceRevision: s.integer,
  approvedConditionalResources: s.array(idSchema),
  rollback: s.object({ strategy: s.enum('restore-checkpoint', 'discard-new-target'), reference: uriSchema }),
});
export type MigrationRequest = Infer<typeof requestSchema>;
export const planSchema = s.object({
  apiVersion: s.enum(coordinate.apiVersion), kind: s.enum('MigrationPlan'), request: requestSchema,
  ready: s.boolean,
  entries: s.array(s.object({ resourceId: idSchema, action: s.enum('copy', 'reference', 'skip', 'blocked'), reason: s.enum('PORTABLE', 'CONDITION_APPROVED', 'CONDITION_REQUIRED', 'SECRET_EXCLUDED', 'NONPORTABLE', 'NOT_OWNED', 'OVERLAPPING_LOCATION') })),
});
export type MigrationPlan = Infer<typeof planSchema>;
export function validateRequest(value: unknown): Result<MigrationRequest> {
  return validate(requestSchema, value, (v, e) => {
    unique(v.approvedConditionalResources, id => id, '/approvedConditionalResources', e);
    if (v.sourceInstanceId === v.targetInstanceId) issue(e, 'IDENTITY_CONFLICT', '/targetInstanceId', 'Transfers require a new destination instance identity');
  });
}
export function validatePlan(value: unknown): Result<MigrationPlan> {
  return validate(planSchema, value, (v, e) => {
    const request = validateRequest(v.request);
    if (!request.ok) for (const error of request.issues) e.push({ ...error, path: `/request${error.path}` });
    unique(v.entries, row => row.resourceId, '/entries', e);
    if (v.ready !== !v.entries.some(row => row.action === 'blocked')) issue(e, 'PLAN_INCONSISTENT', '/ready', 'Ready must match absence of blocked resources');
    const actions = { PORTABLE: 'copy', CONDITION_APPROVED: 'copy', CONDITION_REQUIRED: 'blocked', SECRET_EXCLUDED: 'skip', NONPORTABLE: 'skip', NOT_OWNED: 'reference', OVERLAPPING_LOCATION: 'blocked' };
    v.entries.forEach((row, i) => { if (actions[row.reason] !== row.action) issue(e, 'PLAN_INCONSISTENT', `/entries/${i}`, 'Action and reason disagree'); });
    const approvals = new Set(v.request.approvedConditionalResources);
    v.entries.forEach((row, i) => { if (row.reason === 'CONDITION_APPROVED' && !approvals.has(row.resourceId)) issue(e, 'PLAN_INCONSISTENT', `/entries/${i}`, 'Conditional copy requires explicit approval'); });
  });
}
/** Conservative plan only: no path resolution, IO, source retirement, or secret export. */
export function createMigrationPlan(layout: ManagedLayout, request: MigrationRequest): Result<MigrationPlan> {
  const checkedLayout = validateLayout(layout); if (!checkedLayout.ok) return checkedLayout;
  const checkedRequest = validateRequest(request); if (!checkedRequest.ok) return checkedRequest;
  const errors: Issue[] = [];
  for (const id of request.approvedConditionalResources) if (!layout.resources.some(r => r.id === id && r.portability === 'conditional')) issue(errors, 'INVALID_APPROVAL', '/approvedConditionalResources', `Approval does not identify a conditional resource: ${id}`);
  if (errors.length) return { ok: false, issues: errors };
  const entries: MigrationPlan['entries'] = layout.resources.map(r => {
    if (r.sensitivity === 'secret') return { resourceId: r.id, action: 'skip', reason: 'SECRET_EXCLUDED' };
    if (r.portability === 'nonportable') return { resourceId: r.id, action: 'skip', reason: 'NONPORTABLE' };
    if (r.ownership !== 'exclusive') return { resourceId: r.id, action: 'reference', reason: 'NOT_OWNED' };
    if (r.portability === 'conditional') return request.approvedConditionalResources.includes(r.id)
      ? { resourceId: r.id, action: 'copy', reason: 'CONDITION_APPROVED' }
      : { resourceId: r.id, action: 'blocked', reason: 'CONDITION_REQUIRED' };
    return { resourceId: r.id, action: 'copy', reason: 'PORTABLE' };
  });
  // An exclusive copy may alias another declared resource (including secrets).
  for (const [i, r] of layout.resources.entries()) {
    if (entries[i]!.action !== 'copy') continue;
    const overlaps = layout.resources.some((other, j) => {
      if (i === j || r.location.type !== other.location.type) return false;
      if (r.location.type === 'uri') return r.location.value === other.location.value;
      const a = r.location.value.toLowerCase(); const b = other.location.value.toLowerCase();
      return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
    });
    if (overlaps) entries[i] = { resourceId: r.id, action: 'blocked', reason: 'OVERLAPPING_LOCATION' };
  }
  return { ok: true, value: { apiVersion: coordinate.apiVersion, kind: 'MigrationPlan', request: structuredClone(request), ready: !entries.some(e => e.action === 'blocked'), entries } };
}
export const migrationStates = ['planned', 'prepared', 'copying', 'verifying', 'committed', 'failed', 'rolling-back', 'rolled-back', 'rollback-failed'] as const;
export type MigrationState = typeof migrationStates[number];
export const journalSchema = s.object({
  apiVersion: s.enum(coordinate.apiVersion), kind: s.enum('MigrationJournal'), planId: uriSchema,
  revision: s.integer, state: s.enum(...migrationStates),
});
export type MigrationJournal = Infer<typeof journalSchema>;
export const validateJournal = (value: unknown) => validate(journalSchema, value);
export const transitions: Readonly<Record<MigrationState, readonly MigrationState[]>> = Object.freeze({
  planned: Object.freeze(['prepared', 'failed'] as const), prepared: Object.freeze(['copying', 'failed'] as const),
  copying: Object.freeze(['verifying', 'failed'] as const), verifying: Object.freeze(['committed', 'failed'] as const),
  committed: Object.freeze([]), failed: Object.freeze(['rolling-back'] as const),
  'rolling-back': Object.freeze(['rolled-back', 'rollback-failed'] as const),
  'rolled-back': Object.freeze([]), 'rollback-failed': Object.freeze(['rolling-back'] as const),
});
/** Validates bookkeeping only. Caller supplies authenticated evidence for real transitions. */
export function advanceMigration(journal: MigrationJournal, next: MigrationState, expectedRevision: number): Result<MigrationJournal> {
  const checked = validateJournal(journal); if (!checked.ok) return checked;
  if (expectedRevision !== journal.revision || journal.revision === Number.MAX_SAFE_INTEGER) return { ok: false, issues: [{ code: 'REVISION_CONFLICT', path: '/revision', message: 'Stale or exhausted revision' }] };
  if (!transitions[journal.state].includes(next)) return { ok: false, issues: [{ code: 'INVALID_TRANSITION', path: '/state', message: `Cannot transition from ${journal.state} to ${next}` }] };
  return { ok: true, value: { ...journal, state: next, revision: journal.revision + 1 } };
}
