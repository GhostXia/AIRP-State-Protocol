# Contributing to AIRP-State-Protocol

Thanks for contributing. This repo is the **contract layer** of the AIRP ecosystem — a JSON Schema (source of truth) plus Rust and TypeScript bindings. The widget system is **open**: anyone can add a widget under their own namespace.

## Ground rules

- **All changes go through pull requests.** Don't push to `main`.
- **Verification runs in CI**, not locally. You do not need a Rust/Node toolchain to contribute a widget manifest or docs — open the PR and let CI check it.
- Keep the three sources aligned when you change the protocol: `schema/` (truth), `bindings/rust`, `bindings/typescript`.

## CI checks (`.github/workflows/ci.yml`)

| Job | What it does |
|-----|--------------|
| `rust` | `cargo build --all-targets` + `cargo test` |
| `typescript` | `tsc --noEmit` |
| `schema` | `ajv` validates `examples/*.json` and `widgets/**/*.json` |

## Adding a widget (the common case)

Widgets are open to any third party. To register one:

1. Pick a **namespace** you own and create `widgets/<namespace>/<name>.json`.
   - `type` must be `namespace.name` (must contain a dot), e.g. `acme.relationship-graph`.
   - `core.*` is reserved for first-party widgets.
2. Fill in the manifest per [`schema/widget-manifest.schema.json`](schema/widget-manifest.schema.json). See [`docs/widget-authoring.md`](docs/widget-authoring.md) for field-by-field guidance and the [`widgets/core/`](widgets/core) manifests as examples.
3. Open a PR. CI validates your manifest automatically.
4. The widget's **implementation** (the Vue component) lives in the `AIRP-UI` repo, not here. This repo only owns the manifest/contract. Link your UI PR from the manifest PR if you have one.

Declare only the `capabilities` your widget actually needs — the Gateway enforces them.

## Changing the protocol itself

If you touch message shapes, blueprint, or state semantics:

1. Edit `schema/airp-state-protocol.schema.json` (the truth).
2. Mirror the change in `bindings/rust/src/lib.rs` and `bindings/typescript/src/index.ts`.
3. Update `docs/spec/protocol.md`.
4. Add/adjust an example in `examples/` so the `schema` job covers it.
5. Breaking changes bump the protocol version `v`.
