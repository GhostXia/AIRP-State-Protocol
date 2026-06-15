import { describe, it, expect } from "vitest";
import { makeStatePatch, describeEnvelope } from "./protocol-only";
import { EchoBus } from "./custom-bus";
import { createBadgeWidget } from "./standalone-widget";

describe("standalone examples (lego, not a suite)", () => {
  it("#1 protocol-only: builds and reads an envelope without UI/Gateway", () => {
    const env = makeStatePatch();
    expect(env.v).toBe(1);
    expect(describeEnvelope(env)).toBe("state:w-emotion");
  });

  it("#2 custom bus: the UI contract runs on any AgentBus", () => {
    const bus = new EchoBus();
    const seen: string[] = [];
    const unsubscribe = bus.subscribe((e) => seen.push(e.body.kind));
    bus.dispatch(makeStatePatch());
    unsubscribe();
    expect(seen).toEqual(["state"]);
  });

  it("#3 standalone widget: conforms to the mount interface", () => {
    const mod = createBadgeWidget();
    // Rendering needs a DOM; here we just assert the contract shape.
    expect(typeof mod.mount).toBe("function");
  });
});
