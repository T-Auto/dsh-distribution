export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface Issue { readonly code: string; readonly path: string; readonly message: string }
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly Issue[] };
export interface Schema<T = unknown> {
  readonly json: Readonly<Record<string, unknown>>;
  readonly optional?: true;
  readonly check: (value: unknown, path: string, issues: Issue[]) => void;
  /** Type witness, not serialized. */
  readonly _type?: T;
}
export type Infer<S> = S extends Schema<infer T> ? T : never;
type Shape = Record<string, Schema>;
type ObjectType<S extends Shape> = { [K in keyof S as S[K] extends { optional: true } ? never : K]: Infer<S[K]> } & { [K in keyof S as S[K] extends { optional: true } ? K : never]?: Infer<S[K]> };
export const issue = (issues: Issue[], code: string, path: string, message: string): void => { issues.push({ code, path, message }); };
export const pointer = (path: string, key: string | number): string => `${path}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`;
export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
export function isJson(value: unknown, ancestors = new Set<object>(), depth = 0): value is Json {
  // Library resource bound, not a wire-level limit. Reject before recursive traversal overflows.
  if (depth > 128) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!Array.isArray(value) && !record(value)) return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  const valid = Array.isArray(value)
    ? Array.from({ length: value.length }, (_, i) => Object.hasOwn(value, i) && isJson(value[i], ancestors, depth + 1)).every(Boolean)
    : Reflect.ownKeys(value).every(key => typeof key === 'string' && isJson(value[key], ancestors, depth + 1));
  ancestors.delete(value);
  return valid;
}
export const s = {
  string(pattern?: string): Schema<string> {
    // JavaScript/JSON Schema `$` may match before a final newline: require actual end of input.
    const exactPattern = pattern === undefined ? undefined : `${pattern}(?![\\s\\S])`;
    const regex = exactPattern === undefined ? undefined : new RegExp(exactPattern, 'u');
    return { json: { type: 'string', minLength: 1, ...(exactPattern === undefined ? {} : { pattern: exactPattern }) }, check(v, p, e) {
      if (typeof v !== 'string' || v.length === 0 || (regex && !regex.test(v))) issue(e, 'SCHEMA_INVALID', p, 'Expected nonempty string matching the declared syntax');
    } };
  },
  boolean: { json: { type: 'boolean' }, check(v, p, e) { if (typeof v !== 'boolean') issue(e, 'SCHEMA_INVALID', p, 'Expected boolean'); } } as Schema<boolean>,
  integer: { json: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER }, check(v, p, e) { if (!Number.isSafeInteger(v) || (v as number) < 0) issue(e, 'SCHEMA_INVALID', p, 'Expected nonnegative safe integer'); } } as Schema<number>,
  json: { json: {}, check(v, p, e) { if (!isJson(v)) issue(e, 'SCHEMA_INVALID', p, 'Expected JSON value'); } } as Schema<Json>,
  enum<const T extends readonly string[]>(...values: T): Schema<T[number]> {
    return { json: { type: 'string', enum: values }, check(v, p, e) { if (typeof v !== 'string' || !values.includes(v)) issue(e, 'SCHEMA_INVALID', p, `Expected one of ${values.join(', ')}`); } };
  },
  optional<T>(schema: Schema<T>): Schema<T> & { optional: true } { return { ...schema, optional: true }; },
  array<T>(schema: Schema<T>): Schema<T[]> {
    return { json: { type: 'array', items: schema.json }, check(v, p, e) {
      if (!Array.isArray(v)) { issue(e, 'SCHEMA_INVALID', p, 'Expected array'); return; }
      v.forEach((item, index) => schema.check(item, pointer(p, index), e));
    } };
  },
  object<S extends Shape>(shape: S): Schema<ObjectType<S>> {
    return { json: { type: 'object', properties: Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, v.json])), required: Object.keys(shape).filter(k => !shape[k]!.optional), additionalProperties: false }, check(v, p, e) {
      if (!record(v)) { issue(e, 'SCHEMA_INVALID', p, 'Expected object'); return; }
      for (const key of Object.keys(v)) if (!Object.hasOwn(shape, key)) issue(e, 'SCHEMA_INVALID', pointer(p, key), 'Unknown field');
      for (const [key, schema] of Object.entries(shape)) {
        if (!Object.hasOwn(v, key)) { if (!schema.optional) issue(e, 'SCHEMA_INVALID', pointer(p, key), 'Required field'); }
        else schema.check(v[key], pointer(p, key), e);
      }
    } };
  },
};
export function validate<T>(schema: Schema<T>, value: unknown, semantic?: (value: T, issues: Issue[]) => void): Result<T> {
  const issues: Issue[] = [];
  if (!isJson(value)) return { ok: false, issues: [{ code: 'NOT_JSON', path: '', message: 'Expected finite acyclic JSON data within the 128-level nesting limit' }] };
  schema.check(value, '', issues);
  if (issues.length === 0) semantic?.(value as T, issues);
  return issues.length ? { ok: false, issues } : { ok: true, value: value as T };
}
export function schemaDocument<T>(name: string, schema: Schema<T>): Record<string, unknown> {
  return { $schema: 'https://json-schema.org/draft/2020-12/schema', $id: `https://github.com/T-Auto/dsh-distribution/schema/${name}/v1alpha1`, title: name, ...schema.json };
}
export function unique<T>(items: readonly T[], key: (item: T) => string, path: string, issues: Issue[]): void {
  const seen = new Set<string>();
  items.forEach((item, i) => { const id = key(item); if (seen.has(id)) issue(issues, 'DUPLICATE', pointer(path, i), `Duplicate identity ${id}`); seen.add(id); });
}
