import { describe, expect, it } from "vitest";
import { appointmentSchema, cancelAppointmentSchema } from "./appointment";

describe("appointmentSchema", () => {
  const base = { serviceId: "svc-1", barberId: "barber-1", time: "14:30" };

  it("accepts an appointment for an existing customer", () => {
    expect(appointmentSchema.safeParse({ ...base, customerId: "cust-1" }).success).toBe(true);
  });

  it("accepts an appointment with a new customer's name and phone", () => {
    expect(
      appointmentSchema.safeParse({ ...base, newCustomerName: "Juan", newCustomerPhone: "555-1111" }).success
    ).toBe(true);
  });

  it("rejects when no customer is selected and no new customer data is provided", () => {
    expect(appointmentSchema.safeParse(base).success).toBe(false);
  });

  it("rejects an invalid time format", () => {
    expect(appointmentSchema.safeParse({ ...base, customerId: "cust-1", time: "25:99" }).success).toBe(false);
    expect(appointmentSchema.safeParse({ ...base, customerId: "cust-1", time: "2pm" }).success).toBe(false);
  });

  it("rejects a missing service or barber", () => {
    expect(appointmentSchema.safeParse({ ...base, customerId: "c", serviceId: "" }).success).toBe(false);
    expect(appointmentSchema.safeParse({ ...base, customerId: "c", barberId: "" }).success).toBe(false);
  });
});

describe("cancelAppointmentSchema", () => {
  it("requires a non-empty reason", () => {
    expect(cancelAppointmentSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(cancelAppointmentSchema.safeParse({ reason: "Cliente no llegó" }).success).toBe(true);
  });
});
