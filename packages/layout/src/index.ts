import { s, idSchema, uriSchema, validate, unique, type Infer, type ProtocolDefinition } from '@dsh-distribution/core';
export const coordinate = { apiVersion: 'layout.distribution.dsh.dev/v1alpha1', kind: 'ManagedLayout' } as const;
// A deliberately restricted platform-neutral relative-path profile. Other storage uses URI.
// LAYOUT-02: this pattern is normative and MUST reach schema-only implementations, so it is carried
// by the generated JSON Schema through the discriminated `location` union below, not only by the
// semantic checker. Device-name and trailing-dot rules remain supplementary (platform aliases are
// not expressible in JSON Schema) and are enforced by `validateLayout` with code UNSAFE_PATH.
export const RELATIVE_PATH_PATTERN = '^\\./[A-Za-z0-9_-][A-Za-z0-9._-]*(?:/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$';
export const relativePathSchema = s.string(RELATIVE_PATH_PATTERN);
export const uriLocationSchema = s.object({ type: s.enum('uri'), value: uriSchema });
export const relativePathLocationSchema = s.object({ type: s.enum('relative-path'), value: relativePathSchema });
/**
 * `location` is a discriminated union on `type`. Modeling it as one object with a free-form `value`
 * would publish a schema that accepts `../escape` and `./CON`, i.e. exactly the values this protocol
 * forbids; see docs/proposals/layout.zh.md (LAYOUT-02).
 */
export const locationSchema = s.oneOf(relativePathLocationSchema, uriLocationSchema);
export const layoutSchema = s.object({ resources: s.array(s.object({
  id: idSchema, role: s.string('^(?:config|extensions|state|data|cache|logs|secrets|[a-z][a-z0-9.-]*:[A-Za-z0-9._-]+)$'),
  location: locationSchema, ownership: s.enum('exclusive', 'shared', 'external'),
  portability: s.enum('portable', 'conditional', 'nonportable', 'external'),
  sensitivity: s.enum('public', 'private', 'secret'),
})) });
export type ManagedLayout = Infer<typeof layoutSchema>;
export type ManagedResource = ManagedLayout['resources'][number];
export type ManagedLocation = ManagedResource['location'];
export function validateLayout(value: unknown) {
  return validate(layoutSchema, value, (v, errors) => {
    unique(v.resources, r => r.id, '/resources', errors);
    v.resources.forEach((r, i) => {
      if (r.location.type === 'relative-path') for (const segment of r.location.value.slice(2).split('/')) {
        if (segment.endsWith('.') || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)) errors.push({ code: 'UNSAFE_PATH', path: `/resources/${i}/location/value`, message: 'Relative paths exclude Windows device names and trailing dots' });
      }
      if ((r.ownership === 'external') !== (r.portability === 'external')) errors.push({ code: 'OWNERSHIP_CONFLICT', path: `/resources/${i}`, message: 'External ownership and external portability must appear together' });
      if (r.role === 'secrets' && r.sensitivity !== 'secret') errors.push({ code: 'SENSITIVITY_CONFLICT', path: `/resources/${i}/sensitivity`, message: 'Secrets role requires secret sensitivity' });
    });
  });
}
export const definition: ProtocolDefinition<ManagedLayout> = { ...coordinate, validate: validateLayout };
