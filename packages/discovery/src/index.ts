import { s, uriSchema, distributionIdentitySchema, descriptorSchema, validateDescriptor, sameDistribution, validate, issue, type Infer, type DistributionDescriptor, type Result, type ProtocolDefinition } from '@dsh-distribution/core';
export const coordinate = { apiVersion: 'discovery.distribution.dsh.dev/v1alpha1', kind: 'EnvironmentDiscovery' } as const;
export const discoverySchema = s.object({ references: s.array(uriSchema) });
export type EnvironmentDiscovery = Infer<typeof discoverySchema>;
export const definition: ProtocolDefinition<EnvironmentDiscovery> = { ...coordinate, validate: value => validate(discoverySchema, value) };
export const instanceSchema = s.object({
  apiVersion: s.enum('distribution.dsh.dev/v1alpha1'), kind: s.enum('EnvironmentInstance'),
  instanceId: uriSchema, distribution: distributionIdentitySchema, descriptorRef: uriSchema,
  revision: s.integer,
});
export type EnvironmentInstance = Infer<typeof instanceSchema>;
export const resolutionSchema = s.object({ reference: uriSchema, descriptor: descriptorSchema, instance: s.optional(instanceSchema) });
export type DiscoveryResolution = Infer<typeof resolutionSchema>;
export const validateInstance = (value: unknown) => validate(instanceSchema, value);
export function validateResolution(value: unknown): Result<DiscoveryResolution> {
  return validate(resolutionSchema, value, (v, errors) => {
    const descriptor = validateDescriptor(v.descriptor);
    if (!descriptor.ok) for (const e of descriptor.issues) errors.push({ ...e, path: `/descriptor${e.path}` });
    if (v.instance && (!sameDistribution(v.instance.distribution, v.descriptor.distribution) || v.instance.descriptorRef !== v.reference)) issue(errors, 'IDENTITY_MISMATCH', '/instance', 'Instance must bind the returned distribution and exact reference');
  });
}
export interface DiscoveryProvider {
  resolve(reference: string, context: { readonly signal: AbortSignal }): Promise<unknown>;
}
export interface DiscoveryOptions { readonly timeoutMs?: number; readonly signal?: AbortSignal }
/** Caller selects the provider and authorizes its IO. Never auto-fetch a descriptor URI. */
export async function discover(reference: string, provider: DiscoveryProvider, options: DiscoveryOptions = {}): Promise<Result<DiscoveryResolution>> {
  const fail = (code: string, message: string): Result<DiscoveryResolution> => ({ ok: false, issues: [{ code, path: '', message }] });
  if (!validate(uriSchema, reference).ok) return fail('INVALID_REFERENCE', 'Expected absolute URI reference');
  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) return fail('INVALID_TIMEOUT', 'Timeout must be a positive 32-bit millisecond integer');
  if (options.signal?.aborted) return fail('ABORTED', 'Discovery cancelled');
  const controller = new AbortController();
  let timeout = false;
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timeout = true; controller.abort(); }, timeoutMs);
  let onAbort: (() => void) | undefined;
  try {
    const cancelled = new Promise<never>((_, reject) => { onAbort = () => reject(new Error('aborted')); controller.signal.addEventListener('abort', onAbort, { once: true }); });
    const value = await Promise.race([Promise.resolve().then(() => provider.resolve(reference, { signal: controller.signal })), cancelled]);
    if (controller.signal.aborted) return fail(timeout ? 'TIMEOUT' : 'ABORTED', 'Discovery interrupted');
    if (value === undefined) return fail('NOT_FOUND', 'Reference was not found');
    const checked = validateResolution(value);
    if (!checked.ok) return checked;
    if (checked.value.reference !== reference) return fail('REFERENCE_MISMATCH', 'Provider returned a different reference');
    return { ok: true, value: structuredClone(checked.value) };
  } catch { return fail(controller.signal.aborted ? (timeout ? 'TIMEOUT' : 'ABORTED') : 'PROVIDER_ERROR', 'Discovery did not complete; provider details are not exposed'); }
  finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); if (onAbort) controller.signal.removeEventListener('abort', onAbort); }
}
/** Read-only demonstration; registry persistence and trust policy are out of scope. */
export class MemoryDiscoveryProvider implements DiscoveryProvider {
  readonly #entries = new Map<string, DiscoveryResolution>();
  constructor(entries: readonly DiscoveryResolution[]) {
    for (const entry of entries) {
      if (!validateResolution(entry).ok || this.#entries.has(entry.reference)) throw new TypeError('Invalid or duplicate discovery entry');
      this.#entries.set(entry.reference, structuredClone(entry));
    }
  }
  async resolve(reference: string, context: { readonly signal: AbortSignal }): Promise<DiscoveryResolution | undefined> {
    if (context.signal.aborted) throw new Error('Aborted');
    return structuredClone(this.#entries.get(reference));
  }
}
export function bindInstance(descriptor: DistributionDescriptor, instanceId: string, descriptorRef: string): Result<EnvironmentInstance> {
  const checked = validateDescriptor(descriptor);
  if (!checked.ok) return checked;
  return validateInstance({ apiVersion: 'distribution.dsh.dev/v1alpha1', kind: 'EnvironmentInstance', instanceId, distribution: structuredClone(descriptor.distribution), descriptorRef, revision: 0 });
}
