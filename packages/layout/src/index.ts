import { s, idSchema, uriSchema, validate, unique, type Infer, type ProtocolDefinition } from '@dsh-distribution/core';
export const coordinate = { apiVersion: 'layout.distribution.dsh.dev/v1alpha1', kind: 'ManagedLayout' } as const;
// A deliberately restricted platform-neutral relative-path profile. Other storage uses URI.
export const relativePathSchema = s.string('^\\./[A-Za-z0-9_-][A-Za-z0-9._-]*(?:/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$');
export const locationSchema = s.object({
  type: s.enum('relative-path', 'uri'), value: s.string(),
});
export const layoutSchema = s.object({ resources: s.array(s.object({
  id: idSchema, role: s.string('^(?:config|extensions|state|data|cache|logs|secrets|[a-z][a-z0-9.-]*:[A-Za-z0-9._-]+)$'),
  location: locationSchema, ownership: s.enum('exclusive', 'shared', 'external'),
  portability: s.enum('portable', 'conditional', 'nonportable', 'external'),
  sensitivity: s.enum('public', 'private', 'secret'),
})) });
export type ManagedLayout = Infer<typeof layoutSchema>;
export type ManagedResource = ManagedLayout['resources'][number];
export function validateLayout(value: unknown) {
  return validate(layoutSchema, value, (v, errors) => {
    unique(v.resources, r => r.id, '/resources', errors);
    v.resources.forEach((r, i) => {
      const checker = r.location.type === 'uri' ? uriSchema : relativePathSchema;
      checker.check(r.location.value, `/resources/${i}/location/value`, errors);
      if (r.location.type === 'relative-path') for (const segment of r.location.value.slice(2).split('/')) {
        if (segment.endsWith('.') || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)) errors.push({ code: 'UNSAFE_PATH', path: `/resources/${i}/location/value`, message: 'Relative paths exclude Windows device names and trailing dots' });
      }
      if ((r.ownership === 'external') !== (r.portability === 'external')) errors.push({ code: 'OWNERSHIP_CONFLICT', path: `/resources/${i}`, message: 'External ownership and external portability must appear together' });
      if (r.role === 'secrets' && r.sensitivity !== 'secret') errors.push({ code: 'SENSITIVITY_CONFLICT', path: `/resources/${i}/sensitivity`, message: 'Secrets role requires secret sensitivity' });
    });
  });
}
export const definition: ProtocolDefinition<ManagedLayout> = { ...coordinate, validate: validateLayout };
