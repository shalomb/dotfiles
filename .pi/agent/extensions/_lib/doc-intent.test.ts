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
		expect(parseDocArgs("brief")).toMatchObject({ purpose: "brief", depth: 6 });
		expect(parseDocArgs("pitch for X")).toMatchObject({ purpose: "brief" });
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

describe("parseDocArgs templates", () => {
	it("a template type as the first word sets template, topic and style", () => {
		expect(parseDocArgs("epicmap")).toMatchObject({ action: "write", template: "epicmap", topic: "" });
		expect(parseDocArgs("readout the sandbox account")).toMatchObject({ template: "readout", topic: "the sandbox account" });
		expect(parseDocArgs("Decision template queue renewal formal")).toMatchObject({ template: "decision", topic: "queue renewal", style: "formal" });
	});
	it("keeps the input file as the topic", () => {
		expect(parseDocArgs("decision /tmp/in.json formal")).toMatchObject({ template: "decision", topic: "/tmp/in.json", style: "formal" });
	});
	it("decision stays a purpose unless it is followed by a .json input or the word template", () => {
		expect(parseDocArgs("decision")).toMatchObject({ purpose: "decision" });
		expect(parseDocArgs("decision").template).toBeUndefined();
		expect(parseDocArgs("decision queue renewal").template).toBeUndefined();
		expect(parseDocArgs("report on x").template).toBeUndefined();
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
	it("a brief prompt names the concept-brief sections and readers in order", () => {
		const p = buildDocPrompt(parseDocArgs("brief"));
		for (const s of ["What we need from you", "How we kept options open", "Our biases", "Check it yourself", "regenerate"]) expect(p).toContain(s);
		expect(p).toMatch(/style: formal/);
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
	it("a template prompt names the tools, the scratch file and the no-brand rule", () => {
		for (const t of ["epicmap", "readout", "decision"]) {
			const p = buildDocPrompt(parseDocArgs(t === "decision" ? "decision template the demo topic" : `${t} the demo topic`));
			expect(p).toContain("doc_template");
			expect(p).toContain(`template=${t}`);
			expect(p).toContain("doc_publish");
			expect(p).toMatch(/temp/i);
			expect(p).toMatch(/never add brand, theme, css or colou?r/i);
			expect(p).toMatch(/error: <field>/);
			expect(p).toContain("topic: the demo topic");
		}
	});
	it("an epicmap prompt says the input is a local cache and never Jira", () => {
		const p = buildDocPrompt(parseDocArgs("epicmap"));
		expect(p).toMatch(/local Jira cache folder and an epic key/);
		expect(p).toMatch(/never fetch from Jira/i);
		expect(buildDocPrompt(parseDocArgs("readout"))).not.toMatch(/Jira cache/);
	});
	it("a template prompt carries style formal and does not use the Markdown skeleton text", () => {
		const p = buildDocPrompt(parseDocArgs("decision template formal"));
		expect(p).toMatch(/style=formal/);
		expect(p).not.toContain("Assumed:");
	});
});
