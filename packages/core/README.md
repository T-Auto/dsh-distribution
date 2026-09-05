# @dsh-distribution/core

Identity, declarations and exact-coordinate compatibility. **Draft / 0.1.0-alpha.1; not published.**

## Public API

`validateDescriptor, ProtocolCatalog, assessCompatibility, descriptorSchema, s, validate, schemaDocument`

Main entry: `@dsh-distribution/core`. Exported types are inferred from typed schema declarations; `Result<T>` discriminates `ok: true, value` and `ok: false, issues`. Per-record schemas and types are exported alongside validators; see [source](src/index.ts).

## Contract and boundary

[Specification / evidence](../../docs/proposals/core.md). No IO; catalog knowledge is not support or authorization.

Schema files (where provided) use JSON Schema 2020-12 and cover structure only. Use semantic validators for full domain rules. Inputs must be bounded finite JSON; active JavaScript objects and untrusted definition code are outside the API threat model.

## Development

From repository root: `pnpm install --frozen-lockfile`, `pnpm check`. Package build: `pnpm --filter @dsh-distribution/core build`. Generated `lib/` is untracked. Package files include built ESM/types, schemas, README, [CHANGELOG](CHANGELOG.md), and [MIT license](LICENSE).
