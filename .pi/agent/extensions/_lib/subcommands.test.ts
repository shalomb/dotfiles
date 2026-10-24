// Run: bun test ~/.pi/agent/extensions/_lib/subcommands.test.ts
import { beforeEach, expect, test } from "bun:test";
import { complete, dispatch, registerShared, resetShared, sharedCommand, type SubTree } from "./subcommands.ts";

const calls: string[] = [];
const tree: SubTree = {
	since: {
		description: "diff since session start",
		handler: (args) => void calls.push(`since:${args}`),
		complete: (p) => ["reset", "--stat"].filter((o) => o.startsWith(p)).map((o) => ({ value: o, label: o })),
	},
	diff: { description: "git diff popup", handler: (args) => void calls.push(`diff:${args}`) },
	changes: { description: "live panel", handler: (args) => void calls.push(`changes:${args}`) },
};

beforeEach(() => {
	calls.length = 0;
	resetShared();
});

test("empty argument text suggests every subcommand with its description", async () => {
	const items = await complete(tree, "");
	expect(items?.map((i) => i.value)).toEqual(["since", "diff", "changes"]);
	expect(items?.[0].description).toBe("diff since session start");
});

test("a partial first word filters subcommands by prefix", async () => {
	expect((await complete(tree, "ch"))?.map((i) => i.value)).toEqual(["changes"]);
});

test("no matching subcommand returns null so pi shows no dropdown", async () => {
	expect(await complete(tree, "zz")).toBeNull();
});

test("after a subcommand, its own completions are offered with the subcommand kept in the value", async () => {
	const items = await complete(tree, "since re");
	expect(items).toEqual([{ value: "since reset", label: "reset" }]);
});

test("a subcommand without completions offers nothing for its arguments", async () => {
	expect(await complete(tree, "diff HE")).toBeNull();
});

test("dispatch routes to the subcommand with the remaining argument text", async () => {
	await dispatch(tree, "since --stat -- src", {} as any);
	expect(calls).toEqual(["since:--stat -- src"]);
});

test("dispatch with no subcommand runs the fallback", async () => {
	let fell = "";
	await dispatch(tree, "  ", {} as any, (a) => void (fell = `fallback:${a}`));
	expect(fell).toBe("fallback:");
	expect(calls).toEqual([]);
});

test("dispatch of an unknown subcommand runs the fallback with the full text", async () => {
	let fell = "";
	await dispatch(tree, "bogus x", {} as any, (a) => void (fell = a));
	expect(fell).toBe("bogus x");
});

test("shared commands are looked up at call time, independent of load order", () => {
	expect(sharedCommand("since")).toBeUndefined();
	const handler = () => {};
	const pi = { registerCommand: (_n: string, _s: unknown) => {} };
	registerShared(pi, "since", { description: "d", handler });
	expect(sharedCommand("since")?.handler).toBe(handler);
});

test("registerShared still registers the command with pi under its own name", () => {
	const seen: string[] = [];
	registerShared({ registerCommand: (n: string) => void seen.push(n) }, "diff", { description: "d", handler: () => {} });
	expect(seen).toEqual(["diff"]);
});
