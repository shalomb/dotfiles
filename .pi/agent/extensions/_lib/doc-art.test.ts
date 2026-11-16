// Run: cd _lib && bun test doc-art
import { expect, it } from "bun:test";
import { artCss, artFromFrontMatter } from "./doc-art.ts";

it("reads the art key from leading front matter", () => {
	expect(artFromFrontMatter("---\ntitle: x\nart: circuit\n---\n# H")).toBe("circuit");
	expect(artFromFrontMatter("---\nart: \"Arcs\"\n---\n")).toBe("arcs");
});
it("ignores a missing key, no front matter, an unknown motif, or an art line in the body", () => {
	expect(artFromFrontMatter("---\ntitle: x\n---\n# H")).toBeUndefined();
	expect(artFromFrontMatter("# H\nart: circuit")).toBeUndefined();
	expect(artFromFrontMatter("---\nart: sparkles\n---\n")).toBeUndefined();
	expect(artFromFrontMatter("# H\n\n---\nart: flow\n---\n")).toBeUndefined();
});
it("maps each motif to a right/left pair and none to hidden bands", () => {
	expect(artCss("circuit")).toContain("--art-right:var(--art-circuit)");
	expect(artCss("circuit")).toContain("--art-left:var(--art-waves)");
	expect(artCss("waves")).toContain("--art-left:var(--art-flow)");
	expect(artCss("none")).toContain("display:none");
});
it("no art key yields no css", () => {
	expect(artCss(undefined)).toBe("");
});
