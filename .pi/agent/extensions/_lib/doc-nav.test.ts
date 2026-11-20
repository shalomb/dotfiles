// Run: bun test doc-nav.test.ts
import { describe, expect, it } from "bun:test";
import { MOBILE_MAX, SCROLL_FLOAT_PX, navCss, navMode, resolveNav } from "./doc-nav.ts";

describe("navMode", () => {
  it("presentation wins", () => expect(navMode({ width: 1600, presentation: true })).toBe("presentation"));
  it("mobile at/below breakpoint", () => {
    expect(navMode({ width: MOBILE_MAX })).toBe("mobile");
    expect(navMode({ width: MOBILE_MAX + 1 })).toBe("desktop");
  });
});

describe("resolveNav", () => {
  it("desktop at top: sidebar", () =>
    expect(resolveNav({ width: 1400, scrollY: 0 })).toEqual({ mode: "desktop", layout: "sidebar", sticky: false }));
  it("desktop scrolled: floats", () =>
    expect(resolveNav({ width: 1400, scrollY: SCROLL_FLOAT_PX })).toEqual({ mode: "desktop", layout: "floating", sticky: true }));
  it("desktop toggle floats and toggle again restores when scrolled", () => {
    expect(resolveNav({ width: 1400, scrollY: 0, toggled: true }).layout).toBe("floating");
    expect(resolveNav({ width: 1400, scrollY: 999, toggled: true }).layout).toBe("sidebar");
  });
  it("mobile never uses sidebar", () =>
    expect(resolveNav({ width: 400, scrollY: 0 })).toEqual({ mode: "mobile", layout: "floating", sticky: true }));
  it("presentation hides nav", () =>
    expect(resolveNav({ width: 1400, scrollY: 50, presentation: true })).toEqual({ mode: "presentation", layout: "hidden", sticky: false }));
});

describe("navCss", () => {
  it("is deterministic, offline, and body-width preserving", () => {
    const c = navCss();
    expect(c).toBe(navCss());
    expect(c).toContain("position: sticky");
    expect(c).not.toMatch(/https?:\/\//);
  });
});
