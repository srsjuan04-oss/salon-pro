import { describe, expect, it } from "vitest";
import { serviceSchema } from "./service";

describe("serviceSchema", () => {
  const valid = { name: "Corte de cabello", duration_minutes: "30", price: "250" };

  it("accepts a valid service and applies defaults", () => {
    const result = serviceSchema.parse(valid);
    expect(result).toEqual({
      name: "Corte de cabello",
      description: "",
      benefits: "",
      duration_minutes: 30,
      price: 250,
      is_active: true,
    });
  });

  it("rejects a missing name", () => {
    expect(serviceSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects a non-positive duration", () => {
    expect(serviceSchema.safeParse({ ...valid, duration_minutes: "0" }).success).toBe(false);
  });

  it("accepts a price of 0 but rejects a negative price", () => {
    expect(serviceSchema.safeParse({ ...valid, price: "0" }).success).toBe(true);
    expect(serviceSchema.safeParse({ ...valid, price: "-10" }).success).toBe(false);
  });
});
