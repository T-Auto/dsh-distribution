export * from './schema.js';
import { s, validate, unique, issue, type Infer, type Json, type Issue, type Result } from './schema.js';

export const API_VERSION = 'distribution.dsh.dev/v1alpha1';
export const apiVersionSchema = s.string('^[a-z][a-z0-9.-]*/v[1-9][0-9]*(?:(?:alpha|beta)[1-9][0-9]*)?$');
export const idSchema = s.string('^[A-Za-z0-9][A-Za-z0-9._:@/-]*$');
export const uriSchema = s.string('^[A-Za-z][A-Za-z0-9+.-]*:[^\\s\\u0000-\\u001f\\u007f]+$');
export const coordinateSchema = s.object({ apiVersion: apiVersionSchema, kind: s.string('^[A-Z][A-Za-z0-9]*$') });
export type Coordinate = Infer<typeof coordinateSchema>;
export const distributionIdentitySchema = s.object({ id: uriSchema, version: s.string('^\\S+$') });
export type DistributionIdentity = Infer<typeof distributionIdentitySchema>;
export const protocolDeclarationSchema = s.object({ apiVersion: apiVersionSchema, kind: s.string('^[A-Z][A-Za-z0-9]*$'), required: s.boolean, spec: s.json });
export type ProtocolDeclaration = Infer<typeof protocolDeclarationSchema>;
export const descriptorSchema = s.object({
  apiVersion: s.enum(API_VERSION), kind: s.enum('DistributionDescriptor'),
  distribution: distributionIdentitySchema,
  displayName: s.optional(s.string()),
  protocols: s.array(protocolDeclarationSchema),
});
export type DistributionDescriptor = Infer<typeof descriptorSchema>;
export const keyOf = (coordinate: Coordinate): string => `${coordinate.apiVersion}\0${coordinate.kind}`;
export const sameDistribution = (a: DistributionIdentity, b: DistributionIdentity): boolean => a.id === b.id && a.version === b.version;
export function validateDescriptor(value: unknown): Result<DistributionDescriptor> {
  return validate(descriptorSchema, value, (v, e) => unique(v.protocols, keyOf, '/protocols', e));
}
export interface ProtocolDefinition<T = Json> extends Coordinate {
  readonly validate: (spec: unknown) => Result<T>;
}
/** Catalog knowledge is not participant support, authorization, or agreement. */
export class ProtocolCatalog {
  readonly #definitions = new Map<string, ProtocolDefinition<unknown>>();
  register<T>(definition: ProtocolDefinition<T>): this {
    const identity = validate(coordinateSchema, { apiVersion: definition.apiVersion, kind: definition.kind });
    if (!identity.ok || typeof definition.validate !== 'function') throw new TypeError('Invalid protocol definition');
    const key = keyOf(definition);
    if (this.#definitions.has(key)) throw new TypeError(`Duplicate protocol definition: ${key}`);
    this.#definitions.set(key, Object.freeze({ ...definition }));
    return this;
  }
  get(coordinate: Coordinate): ProtocolDefinition<unknown> | undefined { return this.#definitions.get(keyOf(coordinate)); }
}
export interface CompatibilityReport {
  readonly compatible: boolean;
  readonly issues: readonly Issue[];
  readonly protocols: readonly { readonly apiVersion: string; readonly kind: string; readonly status: 'accepted' | 'unsupported' | 'invalid' | 'unknown'; readonly required: boolean }[];
}
/** Exact-coordinate matching. No domain negotiation and no network or execution. */
export function assessCompatibility(value: unknown, catalog: ProtocolCatalog, supported: readonly Coordinate[]): CompatibilityReport {
  const result = validateDescriptor(value);
  if (!result.ok) return { compatible: false, issues: result.issues, protocols: [] };
  const issues: Issue[] = [];
  const support = new Set<string>();
  for (const [index, row] of supported.entries()) {
    const checked = validate(coordinateSchema, row);
    if (!checked.ok) issue(issues, 'INVALID_SUPPORT', `/supported/${index}`, 'Invalid support coordinate');
    else if (support.has(keyOf(row))) issue(issues, 'DUPLICATE', `/supported/${index}`, 'Duplicate support coordinate');
    else support.add(keyOf(row));
  }
  const protocols = result.value.protocols.map((row, index) => {
    const definition = catalog.get(row);
    let status: 'accepted' | 'unsupported' | 'invalid' | 'unknown';
    if (!definition) status = 'unknown';
    else {
      try {
        const checked = definition.validate(row.spec);
        status = checked.ok ? (support.has(keyOf(row)) ? 'accepted' : 'unsupported') : 'invalid';
        if (!checked.ok) for (const error of checked.issues) issues.push({ ...error, path: `/protocols/${index}/spec${error.path}` });
      } catch { status = 'invalid'; issue(issues, 'DEFINITION_ERROR', `/protocols/${index}`, 'Protocol definition threw during validation'); }
    }
    if (row.required && (status === 'unknown' || status === 'unsupported')) issue(issues, 'REQUIRED_PROTOCOL_UNAVAILABLE', `/protocols/${index}`, `Required protocol is ${status}`);
    return { apiVersion: row.apiVersion, kind: row.kind, status, required: row.required };
  });
  return { compatible: issues.length === 0 && !protocols.some(row => row.status === 'invalid'), issues, protocols };
}
