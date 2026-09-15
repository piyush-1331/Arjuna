import { describe, expect, it } from "vitest";
import { canCoordinate } from "./routers";

describe("role-aware access policy", () => {
  it("allows care coordination roles to manage community workflows", () => {
    expect(canCoordinate("asha_cho")).toBe(true);
    expect(canCoordinate("doctor")).toBe(true);
    expect(canCoordinate("facility_staff")).toBe(true);
    expect(canCoordinate("administrator")).toBe(true);
  });

  it("keeps citizens read-oriented by default", () => {
    expect(canCoordinate("citizen")).toBe(false);
    expect(canCoordinate("unknown")).toBe(false);
  });
});
