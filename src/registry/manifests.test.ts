import { describe, it, expect } from "vitest";
import type { WidgetModule } from "./widget-module";
import { registerEsmWidgetsFromManifests, getManifest } from "./manifests";
import { resolveWidget } from "./registry";

describe("manifest registry", () => {
  it("records manifests and wires their esm widgets", async () => {
    const mod: WidgetModule = { mount() {} };
    registerEsmWidgetsFromManifests(
      [
        {
          type: "acme.graph",
          version: "1.0.0",
          title: "关系图",
          entry: { kind: "esm", source: "https://cdn.example.com/graph.mjs" },
        },
      ],
      async () => ({ default: () => mod }),
    );

    expect(getManifest("acme.graph")?.title).toBe("关系图");

    const reg = resolveWidget("acme.graph");
    expect(reg?.kind).toBe("module");
    if (reg?.kind === "module") {
      expect(await reg.load()).toBe(mod);
    }
  });

  it("records a builtin manifest without registering a loader", () => {
    registerEsmWidgetsFromManifests([
      { type: "core.sample", version: "0.1.0", title: "Sample", entry: { kind: "builtin" } },
    ]);
    expect(getManifest("core.sample")?.type).toBe("core.sample");
    // builtin manifests don't auto-register an esm loader
    expect(resolveWidget("core.sample")).toBeUndefined();
  });
});
