// Black-box tests for ../acp-commit-guard.ts. Run: bun test ~/.pi/agent/extensions/_lib/acp-commit-guard.test.ts
// Lives in _lib/ because top-level files in extensions/ may be loaded as extensions.
import { describe, expect, test } from "bun:test";
import guard from "../acp-commit-guard.ts";

type Handler = (event: unknown, ctx: unknown) => Promise<{ block?: boolean; reason?: string } | undefined>;
let handler: Handler | undefined;
guard({
	on: (name: string, fn: Handler) => {
		if (name === "tool_call") handler = fn;
	},
	// biome-ignore lint/suspicious/noExplicitAny: minimal fake of ExtensionAPI
} as any);

/** Returns the block reason, or undefined when the command is allowed. */
async function verdict(command: string, toolName = "bash"): Promise<string | undefined> {
	const r = await handler?.({ toolName, input: { command } }, { hasUI: false });
	return r?.block ? r.reason : undefined;
}
const allowed = async (c: string) => expect(await verdict(c)).toBeUndefined();
const blocked = async (c: string, reasonPart?: RegExp) => {
	const r = await verdict(c);
	expect(r).toBeDefined();
	if (reasonPart) expect(r).toMatch(reasonPart);
};

const G = "git commit";

describe("allows valid commits", () => {
	test("single -m header", () => allowed(`${G} -m "docs(cv): Fix thing"`));
	test("single -m with a literal multi-line body", () => allowed(`${G} -m "docs(cv): Fix thing\n\nWhy.\nImpact: none."`));
	test("single-quoted -m", () => allowed(`${G} -m 'feat: add x'`));
	test("header and body as two -m flags (git idiom)", () => allowed(`${G} -m "docs(cv): Fix thing" -m "Why this matters."`));
	test("escaped quotes in a body paragraph", () => allowed(`${G} -m "docs(cv): Fix" -m "uses a \\"What I do\\" list"`));
	test("--message=...", () => allowed(`${G} --message="fix(api): handle 404"`));
	test("--message ...", () => allowed(`${G} --message "fix(api): handle 404"`));
	test("-am cluster", () => allowed(`${G} -am "fix: typo"`));
	test("-m glued to value", () => allowed(`${G} -m"fix: typo"`));
	test("breaking marker and scope", () => allowed(`${G} -m "feat(auth)!: drop v1 tokens"`));
	test("git -C dir", () => allowed(`git -C /tmp/repo commit -m "fix: x"`));
	test("git --no-pager", () => allowed(`git --no-pager commit -m "fix: x"`));
	test("after add &&", () => allowed(`git add a b && ${G} -m "fix: x"`));
	test("inside bash -c", () => allowed(`bash -c '${G} -m "fix: x"'`));
	test("heredoc via $(cat <<'EOF')", () =>
		allowed(`${G} -m "$(cat <<'EOF'\ndocs(cv): Fix thing\n\nBody with (parens) and \"quotes\".\nEOF\n)"`));
	test("two commits in one command, both valid", () => allowed(`${G} -m "fix: a" && ${G} -m "fix: b"`));
});

describe("blocks bad commits with a clear reason", () => {
	test("non-conventional header", () => blocked(`${G} -m "Fix stuff"`, /Conventional Commits/));
	test("uppercase type", () => blocked(`${G} -m "Fix: stuff"`, /Conventional Commits/));
	test("bad header even when a good body follows", () => blocked(`${G} -m "Fix stuff" -m "fix: not a header"`, /Fix stuff/));
	test("no message at all", () => blocked(`${G} --amend --no-edit`, /without an inline -m/));
	test("bad header inside heredoc", () => blocked(`${G} -m "$(cat <<'EOF'\nFix stuff\n\nbody\nEOF\n)"`, /Fix stuff/));
	test("bad header inside bash -c", () => blocked(`bash -c '${G} -m "oops"'`, /oops/));
	test("second of two commits is bad", () => blocked(`${G} -m "fix: a" && ${G} -m "oops"`, /oops/));
	test("variable message is called unverifiable, not 'not a header'", () => blocked(`${G} -m "$MSG"`, /cannot verify|can't verify|unverifiable/i));
	test("command substitution that is not a heredoc is unverifiable", () => blocked(`${G} -m "$(date)"`, /cannot verify|can't verify|unverifiable/i));
	test("-F file is unverifiable", () => blocked(`${G} -F /tmp/msg.txt`, /-F/));
	test("--file=... is unverifiable", () => blocked(`${G} --file=/tmp/msg.txt`, /-F|--file/));
	test("AI co-author trailer", () => blocked(`${G} -m "fix: x\n\nCo-authored-by: Claude <noreply@anthropic.com>"`, /attribution/i));
	test("AI attribution via second -m", () => blocked(`${G} -m "fix: x" -m "Generated with Claude Code"`, /attribution/i));
});

describe("does not mistake other commands for a commit", () => {
	test("rg searching for the text", () => allowed(`rg -n "git commit -m foo" docs/`));
	test("echo of an example", () => allowed(`echo 'run: git commit -m "oops" to save'`));
	test("git log --grep", () => allowed(`git log --grep="git commit" --oneline`));
	test("git commit-tree is a different subcommand", () => allowed(`git commit-tree abc123 -m "whatever"`));
	test("a file mentioning AI-generated text is not a commit", () => allowed(`echo "this is AI-generated 🤖" > /tmp/x`));
	test("heredoc body that mentions git commit is data", () => allowed(`cat > /tmp/notes.md <<'EOF'\ngit commit -m "oops"\nEOF`));
	test("non-bash tool is ignored", async () => expect(await verdict(`${G} -m "oops"`, "read")).toBeUndefined());
});
