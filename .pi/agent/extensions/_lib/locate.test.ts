// Run: bun test .pi/agent/extensions/_lib/locate.test.ts
import { describe, expect, it } from "bun:test";
import { parseLocateQuery } from "./locate.ts";

describe("parseLocateQuery", () => {
	it("parses the conversational BDD query with trailing connector", () => {
		const q = parseLocateQuery("find +blank +template and look for workspace name within");
		expect(q.pathTerms).toEqual(["blank", "template"]);
		expect(q.connector).toBe("within");
		expect(q.contentTerms).toEqual(["workspace", "name"]);
		expect(q.mandatory).toEqual(["blank", "template"]);
	});

	it("splits path and content on a mid-sentence connector", () => {
		const q = parseLocateQuery("template in title");
		expect(q.pathTerms).toEqual(["template"]);
		expect(q.connector).toBe("in");
		expect(q.contentTerms).toEqual(["title"]);
	});

	it("treats everything as path terms without a connector", () => {
		const q = parseLocateQuery("blank template");
		expect(q.pathTerms).toEqual(["blank", "template"]);
		expect(q.connector).toBeUndefined();
		expect(q.contentTerms).toEqual([]);
	});

	it("keeps quoted phrases whole", () => {
		const q = parseLocateQuery('"blank workspace" containing foo');
		expect(q.pathTerms).toEqual(["blank workspace"]);
		expect(q.contentTerms).toEqual(["foo"]);
	});

	it("handles empty input", () => {
		expect(parseLocateQuery("  ").pathTerms).toEqual([]);
	});
});
