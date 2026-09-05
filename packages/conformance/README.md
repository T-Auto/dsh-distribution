# @dsh-distribution/conformance

Public contract aggregate validation and CLI. **Draft / 0.1.0-alpha.1; not published.**

## Public API

`checkDescriptor, createPublicCatalog, supportedPublicCoordinates`

Main entry: `@dsh-distribution/conformance`. Exported types are inferred from typed schema declarations; `Result<T>` discriminates `ok: true, value` and `ok: false, issues`. Per-record schemas and types are exported alongside validators; see [source](src/index.ts).

## Contract and boundary

[Specification / evidence](../../conformance/README.md). valid and complete are distinct; unknown protocols are never silently certified.

Schema files (where provided) use JSON Schema 2020-12 and cover structure only. Use semantic validators for full domain rules. Inputs must be bounded finite JSON; active JavaScript objects and untrusted definition code are outside the API threat model.

## Development

From repository root: `pnpm install --frozen-lockfile`, `pnpm check`. Package build: `pnpm --filter @dsh-distribution/conformance build`. Generated `lib/` is untracked. Package files include built ESM/types, schemas, README, [CHANGELOG](CHANGELOG.md), and [MIT license](LICENSE).
