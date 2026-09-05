import { s, uriSchema, validate, issue, type Infer, type Result, type ProtocolDefinition } from '@dsh-distribution/core';
export const coordinate = { apiVersion: 'lifecycle.distribution.dsh.dev/v1alpha1', kind: 'EnvironmentLifecycle' } as const;
export const states = ['declared', 'installed', 'available', 'active', 'inactive', 'broken', 'migrating'] as const;
export type EnvironmentState = typeof states[number];
export const lifecycleSchema = s.object({ states: s.array(s.enum(...states)) });
export type EnvironmentLifecycle = Infer<typeof lifecycleSchema>;
export const definition: ProtocolDefinition<EnvironmentLifecycle> = { ...coordinate, validate: value => validate(lifecycleSchema, value, (v, e) => {
  if (v.states.length === 0 || new Set(v.states).size !== v.states.length) issue(e, 'INVALID_STATES', '/states', 'Declare a nonempty set of distinct observable states');
}) };
export const observationSchema = s.object({
  apiVersion: s.enum(coordinate.apiVersion), kind: s.enum('EnvironmentObservation'), instanceId: uriSchema,
  revision: s.integer, state: s.enum(...states),
});
export type EnvironmentObservation = Infer<typeof observationSchema>;
export const validateObservation = (value: unknown) => validate(observationSchema, value);
/** Observations may skip states; this is not an activation API or universal runtime FSM. */
export function advanceObservation(previous: EnvironmentObservation, next: EnvironmentObservation, expectedRevision: number): Result<EnvironmentObservation> {
  const before = validateObservation(previous); if (!before.ok) return before;
  const after = validateObservation(next); if (!after.ok) return after;
  const issues = [];
  if (previous.instanceId !== next.instanceId) issues.push({ code: 'IDENTITY_MISMATCH', path: '/instanceId', message: 'Observation belongs to another environment' });
  if (expectedRevision !== previous.revision || next.revision <= previous.revision) issues.push({ code: 'REVISION_CONFLICT', path: '/revision', message: 'Expected revision mismatch or non-increasing observation' });
  return issues.length ? { ok: false, issues } : { ok: true, value: structuredClone(next) };
}
