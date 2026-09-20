import { describe, expect, it } from "vitest";
import { saleSchema } from "./sale";

describe("saleSchema", () => {
  const valid = { client: "María López", service: "Corte", amount: "250" };

  it("accepts a valid sale and coerces the amount to a number", () => {
    const result = saleSchema.parse(valid);
    expect(result.amount).toBe(250);
  });

  it("allows an empty payment method (queda pendiente de cobro)", () => {
    expect(saleSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing client name", () => {
    expect(saleSchema.safeParse({ ...valid, client: "" }).success).toBe(false);
  });

  it("rejects a missing service", () => {
    expect(saleSchema.safeParse({ ...valid, service: "" }).success).toBe(false);
  });

  it("rejects a non-positive amount", () => {
    expect(saleSchema.safeParse({ ...valid, amount: "0" }).success).toBe(false);
  });

  it("rejects a non-numeric amount", () => {
    expect(saleSchema.safeParse({ ...valid, amount: "abc" }).success).toBe(false);
  });
});
