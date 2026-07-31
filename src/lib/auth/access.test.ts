import { describe, expect, it } from "vitest";
import { resolveAccessDestination, validAccessDestination } from "./access";

describe("authenticated access routing", () => {
  it("routes internal operators to the owner portal", () => {
    expect(resolveAccessDestination({ internal: true, hasMembership: false, requested: null })).toBe("/manage");
    expect(resolveAccessDestination({ internal: true, hasMembership: false, requested: "/app" })).toBe("/manage");
    expect(resolveAccessDestination({ internal: true, hasMembership: false, requested: "/manage/mail" })).toBe("/manage/mail");
  });

  it("routes organization members to the customer workspace", () => {
    expect(resolveAccessDestination({ internal: false, hasMembership: true, requested: null })).toBe("/app");
    expect(resolveAccessDestination({ internal: false, hasMembership: true, requested: "/app/documents" })).toBe("/app/documents");
    expect(resolveAccessDestination({ internal: false, hasMembership: true, requested: "/manage" })).toBe("/app");
  });

  it("fails safely when the authenticated account has no authorized destination", () => {
    expect(resolveAccessDestination({ internal: false, hasMembership: false, requested: null })).toBe("/login?error=no_access");
    expect(validAccessDestination("//example.com/app")).toBeNull();
    expect(validAccessDestination("/pricing")).toBeNull();
  });
});
