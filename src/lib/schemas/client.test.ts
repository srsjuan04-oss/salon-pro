import { describe, expect, it } from "vitest";
import { clientSchema, registerPaymentSchema } from "./client";

describe("clientSchema", () => {
  const valid = { name: "Ana Pérez", email: "ana@example.com", phone: "+52 55 1234 5678" };

  it("accepts a valid client with defaults applied", () => {
    const result = clientSchema.parse(valid);
    expect(result).toEqual({
      ...valid,
      identificationNumber: "",
      vip: false,
      preferredServices: [],
    });
  });

  it("rejects an empty name", () => {
    expect(clientSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(clientSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a missing phone", () => {
    expect(clientSchema.safeParse({ ...valid, phone: "" }).success).toBe(false);
  });
});

describe("registerPaymentSchema", () => {
  it("coerces a string amount from the input into a number", () => {
    const result = registerPaymentSchema.parse({ amount: "150.50", method: "efectivo" });
    expect(result.amount).toBe(150.5);
  });

  it("rejects a zero or negative amount", () => {
    expect(registerPaymentSchema.safeParse({ amount: "0", method: "efectivo" }).success).toBe(false);
    expect(registerPaymentSchema.safeParse({ amount: "-10", method: "efectivo" }).success).toBe(false);
  });

  it("rejects a missing payment method", () => {
    expect(registerPaymentSchema.safeParse({ amount: "100", method: "" }).success).toBe(false);
  });
});
