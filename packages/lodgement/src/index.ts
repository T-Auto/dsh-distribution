import { s, uriSchema, distributionIdentitySchema, validate, issue, type Infer, type Result, type ProtocolDefinition, type Issue } from '@dsh-distribution/core';

export const coordinate = { apiVersion: 'discovery.distribution.dsh.dev/v1alpha1', kind: 'Lodgement' } as const;
const entryCoordinate = { apiVersion: coordinate.apiVersion, kind: 'DiscoverableEntry' } as const;

export const entrySchema = s.object({
  apiVersion: s.enum(entryCoordinate.apiVersion),
  kind: s.enum(entryCoordinate.kind),
  instanceId: uriSchema,
  distribution: distributionIdentitySchema,
  descriptorRef: uriSchema,
  revision: s.integer,
  displayName: s.optional(s.string()),
  contentDigest: s.string(),
  publisher: s.optional(s.string()),
  status: s.enum('published', 'removed'),
});
export type DiscoverableEntry = Infer<typeof entrySchema>;

export const lodgementSchema = s.object({
  apiVersion: s.enum(coordinate.apiVersion),
  kind: s.enum(coordinate.kind),
  entries: s.array(entrySchema),
});
export type Lodgement = Infer<typeof lodgementSchema>;
export const definition: ProtocolDefinition<Lodgement> = { ...coordinate, validate: value => validate(lodgementSchema, value, validateLodgementSemantics) };

export function validateEntry(value: unknown): Result<DiscoverableEntry> {
  return validate(entrySchema, value, validateEntrySemantics);
}

export function validateLodgement(value: unknown): Result<Lodgement> {
  return validate(lodgementSchema, value, validateLodgementSemantics);
}

function validateLodgementSemantics(value: Lodgement, issues: Issue[]): void {
  const seen = new Set<string>();
  for (const [index, entry] of value.entries.entries()) {
    if (seen.has(entry.instanceId)) issue(issues, 'DUPLICATE_INSTANCE_ID', `/entries/${index}/instanceId`, 'instanceId must be unique within a lodgement');
    seen.add(entry.instanceId);
  }
}

function validateEntrySemantics(value: DiscoverableEntry, issues: Issue[]): void {
  if (value.contentDigest.length === 0) issue(issues, 'MISSING_CONTENT_DIGEST', '/contentDigest', 'contentDigest is required');
}

export function visibleEntries(lodgement: Lodgement, contentDigestMatches: (entry: DiscoverableEntry) => boolean = () => true): readonly DiscoverableEntry[] {
  return lodgement.entries.filter(entry => entry.status === 'published' && contentDigestMatches(entry));
}

export function canTransitionStatus(current: DiscoverableEntry['status'], next: DiscoverableEntry['status']): boolean {
  return current === 'published' && next === 'removed';
}

export function publishEntry(entry: DiscoverableEntry): Result<DiscoverableEntry> {
  if (entry.status !== 'published') return { ok: false, issues: [{ code: 'INVALID_STATUS_TRANSITION', path: '/status', message: 'Only published entries may be published' }] };
  return { ok: true, value: structuredClone(entry) };
}

export function removeEntry(entry: DiscoverableEntry, actor: string, authorizedPublishers: readonly string[] = []): Result<DiscoverableEntry> {
  if (entry.status !== 'published') return { ok: false, issues: [{ code: 'INVALID_STATUS_TRANSITION', path: '/status', message: 'Only published entries may be removed' }] };
  if (actor !== entry.publisher && !authorizedPublishers.includes(actor)) return { ok: false, issues: [{ code: 'FORBIDDEN_REMOVAL', path: '/publisher', message: 'Only the publisher or an authorized actor may remove an entry' }] };
  return { ok: true, value: { ...structuredClone(entry), status: 'removed' } };
}

/** Pure staged publication model: uncommitted entries are never visible. It does not model a real filesystem transaction. */
export class MemoryLodgement {
  readonly #committed: DiscoverableEntry[];
  readonly #staged = new Map<string, DiscoverableEntry>();
  constructor(entries: readonly DiscoverableEntry[] = []) {
    const input = [...entries];
    const checked = validateLodgement({ ...coordinate, entries: input });
    if (!checked.ok) throw new TypeError('Invalid or duplicate lodgement entry');
    this.#committed = input.map(entry => structuredClone(entry));
  }
  stage(entry: DiscoverableEntry): Result<void> {
    const checked = validateEntry(entry);
    if (!checked.ok) return { ok: false, issues: checked.issues };
    if (this.#committed.some(current => current.instanceId === entry.instanceId) || this.#staged.has(entry.instanceId)) return { ok: false, issues: [{ code: 'DUPLICATE_INSTANCE_ID', path: '/instanceId', message: 'instanceId is already registered' }] };
    this.#staged.set(entry.instanceId, structuredClone(entry));
    return { ok: true, value: undefined };
  }
  commit(instanceId: string): Result<DiscoverableEntry> {
    const entry = this.#staged.get(instanceId);
    if (!entry) return { ok: false, issues: [{ code: 'NOT_STAGED', path: '/instanceId', message: 'Entry has no staged commit' }] };
    this.#staged.delete(instanceId);
    if (entry.status === 'published') this.#committed.push(structuredClone(entry));
    return { ok: true, value: structuredClone(entry) };
  }
  visible(): readonly DiscoverableEntry[] { return this.#committed.filter(entry => entry.status === 'published').map(entry => structuredClone(entry)); }
  snapshot(): Lodgement { return { ...coordinate, entries: this.#committed.map(entry => structuredClone(entry)) }; }
  remove(instanceId: string, actor: string, authorizedPublishers: readonly string[] = []): Result<DiscoverableEntry> {
    const index = this.#committed.findIndex(entry => entry.instanceId === instanceId);
    if (index < 0) return { ok: false, issues: [{ code: 'NOT_FOUND', path: '/instanceId', message: 'Published entry was not found' }] };
    const result = removeEntry(this.#committed[index]!, actor, authorizedPublishers);
    if (!result.ok) return result;
    this.#committed[index] = result.value;
    return result;
  }
}

/** Shared lodgement carriers are not owned by products and must not be deleted. */
export function canDeleteLodgementCarrier(): false { return false; }

/** Real filesystem atomicity, persistent global uniqueness and source authentication/signatures are not-tested. */
export const implementationEvidence = Object.freeze({
  filesystemTransactions: 'not-tested',
  persistentGlobalUniqueness: 'not-tested',
  sourceAuthentication: 'not-tested',
  signatures: 'not-tested',
});
