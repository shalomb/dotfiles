// Floating adaptive navigation (vision-and-roadmap §5). Pure: no I/O, no network.
export type NavMode = "presentation" | "mobile" | "desktop";
export type NavLayout = "sidebar" | "floating" | "hidden";
export interface NavInput {
  width: number;
  scrollY?: number;
  /** explicit user toggle: flips the scroll-derived layout (desktop only) */
  toggled?: boolean;
  presentation?: boolean;
}
export interface NavState {
  mode: NavMode;
  layout: NavLayout;
  sticky: boolean;
}

export const MOBILE_MAX = 768;
export const SCROLL_FLOAT_PX = 80;

export function navMode(i: Pick<NavInput, "width" | "presentation">): NavMode {
  if (i.presentation) return "presentation";
  return i.width <= MOBILE_MAX ? "mobile" : "desktop";
}

export function resolveNav(i: NavInput): NavState {
  const mode = navMode(i);
  if (mode === "presentation") return { mode, layout: "hidden", sticky: false };
  if (mode === "mobile") return { mode, layout: "floating", sticky: true };
  const scrolled = (i.scrollY ?? 0) >= SCROLL_FLOAT_PX;
  const floating = i.toggled ? !scrolled : scrolled;
  return { mode, layout: floating ? "floating" : "sidebar", sticky: floating };
}

/** CSS keyed on data-nav-layout on the nav element; the body never loses width. */
export function navCss(): string {
  return `nav.doc-nav[data-nav-layout="sidebar"] { position: fixed; top: 0; left: 0; bottom: 0; width: 16rem; overflow: auto; }
nav.doc-nav[data-nav-layout="sidebar"] ~ main { margin-left: 16rem; }
nav.doc-nav[data-nav-layout="floating"] { position: sticky; top: 0; z-index: 100; width: 100%; max-height: 3rem; overflow: auto; }
nav.doc-nav[data-nav-layout="floating"]:focus-within, nav.doc-nav[data-nav-layout="floating"]:hover { max-height: 70vh; }
nav.doc-nav[data-nav-layout="hidden"] { display: none; }
@media print { nav.doc-nav { display: none; } }
`;
}
