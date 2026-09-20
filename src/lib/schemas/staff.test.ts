import { describe, expect, it } from "vitest";
import { staffMemberSchema, teamAccessSchema } from "./staff";

describe("staffMemberSchema", () => {
  it("only requires the name, defaulting the rest to empty strings", () => {
    const result = staffMemberSchema.parse({ name: "Carlos" });
    expect(result).toEqual({ name: "Carlos", email: "", phone: "", specialty: "" });
  });

  it("rejects an empty name", () => {
    expect(staffMemberSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("teamAccessSchema", () => {
  const valid = { name: "Carlos", email: "carlos@example.com", password: "123456" };

  it("accepts valid data and defaults role to 'staff'", () => {
    expect(teamAccessSchema.parse(valid).role).toBe("staff");
  });

  it("rejects a password shorter than 6 characters", () => {
    expect(teamAccessSchema.safeParse({ ...valid, password: "12345" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(teamAccessSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(teamAccessSchema.safeParse({ ...valid, role: "owner" }).success).toBe(false);
  });
});
