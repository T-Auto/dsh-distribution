# @dsh-distribution/discovery

Environment instances and provider resolution. **Draft / 0.1.0-alpha.1; not published.**

## Public API

`bindInstance, validateInstance, validateResolution, discover, MemoryDiscoveryProvider, coordinate, definition`

Main entry: `@dsh-distribution/discovery`. Exported types are inferred from typed schema declarations; `Result<T>` discriminates `ok: true, value` and `ok: false, issues`. Per-record schemas and types are exported alongside validators; see [source](src/index.ts).

## Contract and boundary

[Specification / evidence](../../docs/proposals/discovery.md). Caller selects and trusts provider; wrapper cancellation cannot terminate noncooperative IO.

Schema files (where provided) use JSON Schema 2020-12 and cover structure only. Use semantic validators for full domain rules. Inputs must be bounded finite JSON; active JavaScript objects and untrusted definition code are outside the API threat model.

## Development

From repository root: `pnpm install --frozen-lockfile`, `pnpm check`. Package build: `pnpm --filter @dsh-distribution/discovery build`. Generated `lib/` is untracked. Package files include built ESM/types, schemas, README, [CHANGELOG](CHANGELOG.md), and [MIT license](LICENSE).
