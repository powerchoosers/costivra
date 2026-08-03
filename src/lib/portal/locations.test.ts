import { describe, expect, it } from "vitest";
import { locationInput } from "@/lib/portal/locations";

describe("location input", () => {
  it("normalizes a customer location without accepting arbitrary fields", () => {
    expect(locationInput({
      name: "  Austin Downtown  ",
      line1: "100 Congress Ave",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "us",
      status: "inactive",
      organization_id: "foreign-tenant",
    })).toEqual({
      name: "Austin Downtown",
      status: "inactive",
      address: {
        line1: "100 Congress Ave",
        line2: "",
        city: "Austin",
        state: "TX",
        postal_code: "78701",
        country: "US",
      },
    });
  });

  it("requires a name and omits an empty address", () => {
    expect(locationInput({ name: "" })).toBeNull();
    expect(locationInput({ name: "Head office" })).toEqual({
      name: "Head office",
      status: "active",
      address: null,
    });
  });
});
