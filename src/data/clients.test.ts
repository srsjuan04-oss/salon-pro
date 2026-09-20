import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateOverdueDays, getOverdueStatus } from "./clients";

const NOW = new Date("2026-01-31T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("calculateOverdueDays", () => {
  it("returns 0 when there is no due date", () => {
    expect(calculateOverdueDays(undefined)).toBe(0);
  });

  it("returns 0 when the due date is today", () => {
    expect(calculateOverdueDays("2026-01-31T12:00:00Z")).toBe(0);
  });

  it("returns 0 when the due date is in the future", () => {
    expect(calculateOverdueDays("2026-02-10T12:00:00Z")).toBe(0);
  });

  it("returns the number of days elapsed since the due date", () => {
    expect(calculateOverdueDays("2026-01-16T12:00:00Z")).toBe(15);
    expect(calculateOverdueDays("2026-01-01T12:00:00Z")).toBe(30);
  });
});

describe("getOverdueStatus", () => {
  it("returns 'al corriente' at 0 days", () => {
    expect(getOverdueStatus(0)).toEqual({
      label: "Al corriente",
      color: "bg-green-500/10 text-green-600 border-green-500/20",
    });
  });

  it("returns the yellow bucket at the 1-15 day boundary", () => {
    expect(getOverdueStatus(1).color).toContain("yellow");
    expect(getOverdueStatus(15).color).toContain("yellow");
  });

  it("returns the orange bucket at the 16-30 day boundary", () => {
    expect(getOverdueStatus(16).color).toContain("orange");
    expect(getOverdueStatus(30).color).toContain("orange");
  });

  it("returns the destructive bucket past 30 days", () => {
    expect(getOverdueStatus(31).color).toContain("destructive");
  });

  it("includes the day count in the label for overdue clients", () => {
    expect(getOverdueStatus(5).label).toBe("5 días");
  });
});
