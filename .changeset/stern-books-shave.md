---
'@dsh-distribution/core': patch
'@dsh-distribution/layout': patch
'@dsh-distribution/lodgement': patch
---

Tighten two Draft contract rules that were only enforced by the semantic checker, and align the
proposal set with the dsh-std repository conventions.

- `layout`: `location` is now a discriminated union on `type`, so the `relative-path` pattern reaches
  the generated JSON Schema. A schema-only implementation previously accepted `../escape`,
  `/absolute` and `./a\b`. Platform reserved names and trailing dots remain semantic-only
  (`UNSAFE_PATH`) because JSON Schema cannot express them; the split is stated in LAYOUT-02 and in
  the conformance matrix.
- `lodgement`: `contentDigest` is now `<algorithm>:<lowercase hex>` with the algorithm/hex-length
  pairing checked cross-field. The previous LOD-03 check was unreachable (it compared a
  `minLength: 1` string against zero), so LOD-03 was unenforced; violations now report
  `INVALID_DIGEST`, with a fixture covering the wrong-length case.
- `core`: the typed schema DSL gains `oneOf`; digest syntax helpers (`digestSchema`,
  `digestIssue`) are shared by contracts that must carry a reproducible digest.
- Proposals were rewritten to the dsh-std register: status and date on the first screen, stable
  requirement IDs referenced from the matrix, one document per protocol, no document numbering.
  The conformance matrix now records every emitted error code and the intended schema/semantic
  divergences.

No breaking wire change: coordinates, kinds and field sets are unchanged.
