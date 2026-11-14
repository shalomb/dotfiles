// Run: bun test doc-intent.test.ts
import { describe, expect, it } from "bun:test";
import { buildDocPrompt, parseDocArgs } from "./doc-intent.ts";

describe("parseDocArgs", () => {
	it("bare /doc infers everything from the session", () => {
		expect(parseDocArgs("")).toEqual({ action: "write", purpose: undefined, depth: undefined, audience: undefined, style: undefined, topic: "" });
	});
	it("a purpose word alone takes depth from the purpose", () => {
		const i = parseDocArgs("decision");
		expect([i.purpose, i.topic]).toEqual(["decision", ""]);
	});
	it("aliases map to purpose and depth", () => {
		expect(parseDocArgs("one-pager on intake")).toMatchObject({ purpose: undefined, depth: 1, topic: "on intake" });
		expect(parseDocArgs("six-pager about takos")).toMatchObject({ depth: 6, topic: "about takos" });
		expect(parseDocArgs("brief")).toMatchObject({ purpose: "report", depth: 6 });
		expect(parseDocArgs("rfc for X")).toMatchObject({ purpose: "decision" });
		expect(parseDocArgs("adr")).toMatchObject({ purpose: "decision" });
	});
	it("reads audience, style and depth modifiers anywhere", () => {
		const i = parseDocArgs("report on DevSecOps load for the staffing panel formal deeper");
		expect(i).toMatchObject({ purpose: "report", audience: "the staffing panel", style: "formal", depth: "deeper", topic: "on DevSecOps load" });
	});
	it("library subcommands", () => {
		expect(parseDocArgs("find takos intake")).toMatchObject({ action: "find", topic: "takos intake" });
		expect(parseDocArgs("list decision")).toMatchObject({ action: "list", purpose: "decision" });
		expect(parseDocArgs("file ~/Downloads/x.html")).toMatchObject({ action: "file", topic: "~/Downloads/x.html" });
		expect(parseDocArgs("open")).toMatchObject({ action: "open" });
	});
	it("re-render verbs act on the last document", () => {
		expect(parseDocArgs("deck")).toMatchObject({ action: "write", purpose: "deck" });
		expect(parseDocArgs("shorter")).toMatchObject({ action: "revise", depth: "shorter" });
		expect(parseDocArgs("for the CTO")).toMatchObject({ action: "revise", audience: "the CTO" });
	});
});

describe("buildDocPrompt", () => {
	it("tells the model to infer the topic from the session and state assumptions", () => {
		const p = buildDocPrompt(parseDocArgs("decision"));
		expect(p).toContain("/skill:docs-authoring");
		expect(p).toMatch(/purpose: decision/);
		expect(p).toMatch(/1 page/);
		expect(p).toMatch(/most recent unresolved/i);
		expect(p).toMatch(/Assumed:/);
		expect(p).toContain("doc_publish");
	});
	it("defaults depth from purpose", () => {
		expect(buildDocPrompt(parseDocArgs("report"))).toMatch(/6 pages/);
		expect(buildDocPrompt(parseDocArgs("status"))).toMatch(/1 page/);
	});
	it("bare /doc lets the model choose the purpose", () => {
		expect(buildDocPrompt(parseDocArgs(""))).toMatch(/choose the purpose/i);
	});
	it("revise works on the last document's source", () => {
		expect(buildDocPrompt(parseDocArgs("shorter"))).toMatch(/last document/i);
	});
});
