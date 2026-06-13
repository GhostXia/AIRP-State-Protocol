import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { registerWidget, resolveWidget, registeredTypes } from "./registry";

const stub = {} as Component;

describe("widget registry", () => {
  it("registers and resolves a widget type", () => {
    registerWidget("test.widget", () => stub);
    const loader = resolveWidget("test.widget");
    expect(loader).toBeDefined();
    expect(loader?.()).toBe(stub);
  });

  it("returns undefined for an unknown type", () => {
    expect(resolveWidget("nope.unknown")).toBeUndefined();
  });

  it("lists registered types", () => {
    registerWidget("test.listed", () => stub);
    expect(registeredTypes()).toContain("test.listed");
  });
});
