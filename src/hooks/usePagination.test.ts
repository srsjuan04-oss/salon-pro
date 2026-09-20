import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePagination } from "./usePagination";

const items = Array.from({ length: 23 }, (_, i) => i + 1);

describe("usePagination", () => {
  it("slices the first page by default", () => {
    const { result } = renderHook(() => usePagination(items, 10));
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual(items.slice(0, 10));
    expect(result.current.totalPages).toBe(3);
    expect(result.current.rangeStart).toBe(1);
    expect(result.current.rangeEnd).toBe(10);
  });

  it("navigates forward and backward", () => {
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => result.current.goNext());
    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual(items.slice(10, 20));

    act(() => result.current.goNext());
    expect(result.current.page).toBe(3);
    expect(result.current.pageItems).toEqual(items.slice(20, 23));
    expect(result.current.rangeEnd).toBe(23);

    act(() => result.current.goNext());
    expect(result.current.page).toBe(3); // clamped, no page 4

    act(() => result.current.goPrev());
    expect(result.current.page).toBe(2);
  });

  it("clamps the current page down when the item list shrinks", () => {
    const { result, rerender } = renderHook(({ data }) => usePagination(data, 10), {
      initialProps: { data: items },
    });

    act(() => result.current.goNext());
    act(() => result.current.goNext());
    expect(result.current.page).toBe(3);

    rerender({ data: items.slice(0, 5) });
    expect(result.current.page).toBe(1);
  });

  it("resets to page 1 when resetKey changes", () => {
    const { result, rerender } = renderHook(({ key }) => usePagination(items, 10, key), {
      initialProps: { key: "today" },
    });

    act(() => result.current.goNext());
    expect(result.current.page).toBe(2);

    rerender({ key: "yesterday" });
    expect(result.current.page).toBe(1);
  });

  it("reports an empty range for an empty list", () => {
    const { result } = renderHook(() => usePagination([] as number[], 10));
    expect(result.current.rangeStart).toBe(0);
    expect(result.current.rangeEnd).toBe(0);
    expect(result.current.totalPages).toBe(1);
  });
});
