import { s, idSchema, uriSchema, coordinateSchema, validate, unique, issue, type Infer, type ProtocolDefinition } from '@dsh-distribution/core';
export const coordinate = { apiVersion: 'composition.distribution.dsh.dev/v1alpha1', kind: 'EnvironmentComposition' } as const;
export const compositionSchema = s.object({ components: s.array(s.object({
  id: idSchema, ref: uriSchema,
  contracts: s.optional(s.array(coordinateSchema)),
  dependsOn: s.optional(s.array(idSchema)),
})) });
export type EnvironmentComposition = Infer<typeof compositionSchema>;
export function validateComposition(value: unknown) {
  return validate(compositionSchema, value, (v, errors) => {
    unique(v.components, c => c.id, '/components', errors);
    const ids = new Set(v.components.map(c => c.id));
    v.components.forEach((c, i) => {
      unique(c.contracts ?? [], c => `${c.apiVersion}\0${c.kind}`, `/components/${i}/contracts`, errors);
      unique(c.dependsOn ?? [], id => id, `/components/${i}/dependsOn`, errors);
      for (const dep of c.dependsOn ?? []) if (!ids.has(dep) || dep === c.id) issue(errors, 'INVALID_REFERENCE', `/components/${i}/dependsOn`, 'Dependency must identify another component in this composition');
    });
    // Kahn traversal avoids call-stack exhaustion for large graphs.
    const indegree = new Map(v.components.map(c => [c.id, c.dependsOn?.length ?? 0]));
    const dependents = new Map<string, string[]>();
    for (const c of v.components) for (const dep of c.dependsOn ?? []) { const rows = dependents.get(dep) ?? []; rows.push(c.id); dependents.set(dep, rows); }
    const queue = v.components.filter(c => !c.dependsOn?.length).map(c => c.id);
    for (let i = 0; i < queue.length; i++) for (const next of dependents.get(queue[i]!) ?? []) { const degree = indegree.get(next)! - 1; indegree.set(next, degree); if (degree === 0) queue.push(next); }
    if (errors.length === 0 && queue.length !== v.components.length) issue(errors, 'COMPOSITION_CYCLE', '/components', 'Composition dependency graph must be acyclic');
  });
}
export const definition: ProtocolDefinition<EnvironmentComposition> = { ...coordinate, validate: validateComposition };
