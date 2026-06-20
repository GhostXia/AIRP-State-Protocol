import { describe, it, expect, beforeEach } from "vitest";
import type { WidgetDef } from "../protocol/types";
import {
  needsConsent,
  canMount,
  effectiveCapabilities,
  grant,
  revoke,
  isGranted,
  clearGrants,
} from "./consent";

const esm: WidgetDef = {
  type: "acme.x",
  version: "1.0.0",
  title: "X",
  entry: { kind: "esm", source: "https://cdn.example.com/x.mjs" },
  capabilities: ["read:state", "call:tool"],
};
const builtin: WidgetDef = {
  type: "core.chat",
  version: "0.1.0",
  title: "对话",
  entry: { kind: "builtin" },
  capabilities: ["read:state"],
};

describe("consent gate", () => {
  beforeEach(() => clearGrants());

  it("only esm widgets need consent", () => {
    expect(needsConsent(esm)).toBe(true);
    expect(needsConsent(builtin)).toBe(false);
  });

  it("builtin may always mount; esm only after grant", () => {
    expect(canMount(builtin)).toBe(true);
    expect(canMount(esm)).toBe(false);
    grant(esm);
    expect(canMount(esm)).toBe(true);
    revoke(esm);
    expect(canMount(esm)).toBe(false);
  });

  it("withholds capabilities until granted", () => {
    expect(effectiveCapabilities(esm)).toEqual([]);
    grant(esm);
    expect(effectiveCapabilities(esm)).toEqual(["read:state", "call:tool"]);
  });

  it("builtin capabilities are available without a grant", () => {
    expect(effectiveCapabilities(builtin)).toEqual(["read:state"]);
    expect(isGranted(builtin)).toBe(false);
  });

  it("a changed source does NOT inherit the old grant", () => {
    grant(esm);
    expect(canMount(esm)).toBe(true);
    const moved: WidgetDef = { ...esm, entry: { kind: "esm", source: "https://evil.example.com/x.mjs" } };
    expect(canMount(moved)).toBe(false);
  });

  it("a bumped version does NOT inherit the old grant", () => {
    grant(esm);
    const bumped: WidgetDef = { ...esm, version: "1.1.0" };
    expect(canMount(bumped)).toBe(false);
  });
});
