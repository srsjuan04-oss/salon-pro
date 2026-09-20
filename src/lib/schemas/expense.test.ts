import { describe, expect, it } from "vitest";
import { expenseSchema } from "./expense";

describe("expenseSchema", () => {
  const valid = { description: "Renta", category: "Renta", amount: "5000" };

  it("accepts a valid expense and defaults type to 'variable'", () => {
    const result = expenseSchema.parse(valid);
    expect(result.amount).toBe(5000);
    expect(result.type).toBe("variable");
  });

  it("accepts an explicit 'fixed' type", () => {
    expect(expenseSchema.parse({ ...valid, type: "fixed" }).type).toBe("fixed");
  });

  it("rejects an invalid type", () => {
    expect(expenseSchema.safeParse({ ...valid, type: "other" }).success).toBe(false);
  });

  it("rejects a missing description or category", () => {
    expect(expenseSchema.safeParse({ ...valid, description: "" }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...valid, category: "" }).success).toBe(false);
  });

  it("rejects a non-positive amount", () => {
    expect(expenseSchema.safeParse({ ...valid, amount: "-5" }).success).toBe(false);
  });
});
