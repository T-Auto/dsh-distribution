import { ProtocolCatalog, validateDescriptor, keyOf, type Issue, type Coordinate } from '@dsh-distribution/core';
import { definition as composition } from '@dsh-distribution/composition';
import { definition as layout } from '@dsh-distribution/layout';
import { definition as discovery } from '@dsh-distribution/discovery';
import { definition as lifecycle } from '@dsh-distribution/lifecycle';
import { definition as portability } from '@dsh-distribution/portability';
import { definition as lodgement } from '@dsh-distribution/lodgement';
export const publicDefinitions = Object.freeze([composition, layout, discovery, lifecycle, portability, lodgement]);
export function createPublicCatalog(): ProtocolCatalog {
  const catalog = new ProtocolCatalog();
  for (const definition of publicDefinitions) catalog.register<unknown>(definition);
  return catalog;
}
export interface ConformanceReport {
  readonly valid: boolean;
  readonly complete: boolean;
  readonly issues: readonly Issue[];
  readonly unchecked: readonly Coordinate[];
}
/** Validity is not compatibility: no claim about a Manager's runtime support. */
export function checkDescriptor(value: unknown, catalog = createPublicCatalog()): ConformanceReport {
  const checked = validateDescriptor(value);
  if (!checked.ok) return { valid: false, complete: false, issues: checked.issues, unchecked: [] };
  const issues: Issue[] = [];
  const unchecked: Coordinate[] = [];
  for (const [index, row] of checked.value.protocols.entries()) {
    const definition = catalog.get(row);
    if (!definition) { unchecked.push({ apiVersion: row.apiVersion, kind: row.kind }); continue; }
    try {
      const result = definition.validate(row.spec);
      if (!result.ok) for (const error of result.issues) issues.push({ ...error, path: `/protocols/${index}/spec${error.path}` });
    } catch { issues.push({ code: 'DEFINITION_ERROR', path: `/protocols/${index}`, message: 'Protocol definition threw' }); }
  }
  return { valid: issues.length === 0, complete: issues.length === 0 && unchecked.length === 0, issues, unchecked };
}
export function supportedPublicCoordinates(): Coordinate[] {
  return [...new Map(publicDefinitions.map(row => [keyOf(row), { apiVersion: row.apiVersion, kind: row.kind }])).values()];
}
