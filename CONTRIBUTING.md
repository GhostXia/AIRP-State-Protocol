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
| `typescript` | `tsc --noEmit` (protocol binding) |
| `schema` | `ajv` validates `examples/*.json` and `widgets/**/*.json` |
| `ui` | `npm install` + `npm run build` (`vue-tsc` + `vite build`) + `npm test` (vitest) |

## Running the UI

```bash
npm install
npm run dev        # Vite dev server; MockBus provides a sample session
npm run build      # vue-tsc typecheck + vite build
npm run tauri dev  # run inside the Tauri desktop shell (needs local Tauri deps)
```

> Bundling to a packaged `.exe` is disabled for now (`src-tauri/tauri.conf.json` `bundle.active=false`).

## Adding a widget (the common case)

Widgets are open to any third party. To register one:

1. Pick a **namespace** you own and create `widgets/<namespace>/<name>.json`.
   - `type` must be `namespace.name` (must contain a dot), e.g. `acme.relationship-graph`.
   - `core.*` is reserved for first-party widgets.
2. Fill in the manifest per [`schema/widget-manifest.schema.json`](schema/widget-manifest.schema.json). See [`docs/widget-authoring.md`](docs/widget-authoring.md) for field-by-field guidance and the [`widgets/core/`](widgets/core) manifests as examples.
3. Add the **component** that renders it. You are not tied to Vue — two kinds:
   - **module** (framework-agnostic, recommended for third parties): export a factory returning a `WidgetModule` (`mount(el, ctx)` / `unmount()`); build the DOM with any tech. Vanilla sample: `src/widgets/clock.module.ts`. Register with `registerModuleWidget(type, ...)`.
   - **vue** (first-party): a `.vue` file under `src/widgets/` with `defineProps<{ instance; state }>()` + `defineEmits<{ (e:"intent", ...) }>()`. Register with `registerVueWidget(type, ...)`. Sample: `src/widgets/ChatWidget.vue`.
   - First-party widgets register in `src/registry/index.ts`; third-party esm widgets are loaded via the manifest's `entry: { kind: "esm", source }`.
4. Open a PR. CI validates the manifest and builds + tests the UI automatically.

Declare only the `capabilities` your widget needs — the host enforces them. **We expose the interface; we do not audit widget code.** See [`docs/SECURITY.md`](docs/SECURITY.md) for the responsibility boundary.

## Changing the protocol itself

If you touch message shapes, blueprint, or state semantics:

1. Edit `schema/airp-state-protocol.schema.json` (the truth).
2. Mirror the change in `bindings/rust/src/lib.rs` and `bindings/typescript/src/index.ts`.
3. Update `docs/spec/protocol.md`.
4. Add/adjust an example in `examples/` so the `schema` job covers it.
5. Breaking changes bump the protocol version `v`.
