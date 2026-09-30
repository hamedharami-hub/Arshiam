import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useResizableSplit } from "./useResizableSplit";

describe("note column resizing", () => {
  beforeEach(() => localStorage.clear());
  for (const direction of ["ltr", "rtl"] as const) {
    it(`resizes from the list edge in ${direction} and remembers the width`, () => {
      const { result } = renderHook(() => useResizableSplit({ storageKey: "notes-width", direction, minRatio: 18, maxRatio: 55 }));
      const container = document.createElement("div");
      container.getBoundingClientRect = () => ({ left: 0, right: 1000, width: 1000 } as DOMRect);
      result.current.containerRef.current = container;
      const event = { button: 0, pointerType: "mouse", pointerId: 1, currentTarget: container, clientX: direction === "rtl" ? 700 : 300 } as unknown as React.PointerEvent<HTMLDivElement>;
      act(() => result.current.handlePointerDown(event));
      act(() => result.current.handlePointerMove(event));
      expect(result.current.splitRatio).toBe(30);
      act(() => result.current.handlePointerUp(event));
      expect(localStorage.getItem("notes-width")).toBe("30");
    });
  }
});
