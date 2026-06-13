import { describe, it, expect, beforeEach } from "vitest";
import { stateStore, setState, patchState } from "./store";

beforeEach(() => {
  for (const key of Object.keys(stateStore)) delete stateStore[key];
});

describe("state store", () => {
  it("set replaces a scope", () => {
    setState("a", { x: 1 });
    expect(stateStore.a).toEqual({ x: 1 });
  });

  it("patch replace updates a value", () => {
    setState("e", { emotion: 60, label: "平静" });
    patchState("e", [{ op: "replace", path: "/emotion", value: 80 }]);
    expect((stateStore.e as { emotion: number }).emotion).toBe(80);
  });

  it("patch add appends to an array with '-'", () => {
    setState("c", { messages: [] });
    patchState("c", [{ op: "add", path: "/messages/-", value: { id: "1" } }]);
    expect((stateStore.c as { messages: unknown[] }).messages).toHaveLength(1);
  });

  it("patch remove deletes a key", () => {
    setState("o", { a: 1, b: 2 });
    patchState("o", [{ op: "remove", path: "/b" }]);
    expect((stateStore.o as { b?: number }).b).toBeUndefined();
  });

  it("patch on a fresh scope initializes an object", () => {
    patchState("new", [{ op: "add", path: "/k", value: 1 }]);
    expect((stateStore.new as { k: number }).k).toBe(1);
  });
});
