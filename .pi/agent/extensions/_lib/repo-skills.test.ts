// Run: bun test ~/.pi/agent/extensions/_lib/repo-skills.test.ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverRepoSkills, parseFrontmatter } from "./repo-skills";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "repo-skills-")); });
afterEach(() => rmSync(root, { recursive: true, force: true }));
const skill = (base: string, dir: string, name: string, desc = `${name} desc`) => {
	const p = join(root, base, dir, name, "SKILL.md");
	mkdirSync(join(p, ".."), { recursive: true });
	writeFileSync(p, `---\nname: ${name}\ndescription: ${desc}\n---\n# ${name}\n`);
	return p;
};
const repo = (rel = "repo") => { mkdirSync(join(root, rel, ".git"), { recursive: true }); return join(root, rel); };
const names = (r: { name: string }[]) => r.map((s) => s.name).sort();

test("parseFrontmatter: plain, quoted and folded-block values; none when absent", () => {
	expect(parseFrontmatter('---\nname: a\ndescription: "quoted: yes"\n---\nbody')).toEqual({ name: "a", description: "quoted: yes" });
	expect(parseFrontmatter("---\nname: b\ndescription: >\n  folded\n  text\nother: x\n---\n")).toMatchObject({ name: "b", description: "folded text" });
	expect(parseFrontmatter("# no frontmatter")).toEqual({});
});

test("finds skills under .claude .gemini .github .agent .agents .pi .codex in the repo", () => {
	const r = repo();
	for (const d of [".claude", ".gemini", ".github", ".agent", ".agents", ".pi", ".codex"]) skill("repo", `${d}/skills`, `s-${d.slice(1)}`);
	expect(names(discoverRepoSkills(r, root))).toEqual(["s-agent", "s-agents", "s-claude", "s-codex", "s-gemini", "s-github", "s-pi"]);
});

test("returns name, description, filePath, baseDir and the source dir label", () => {
	const r = repo();
	const p = skill("repo", ".claude/skills", "x", "does x");
	expect(discoverRepoSkills(r, root)).toEqual([{ name: "x", description: "does x", filePath: p, baseDir: join(r, ".claude/skills/x"), source: ".claude/skills" }]);
});

test("walks up from a subdirectory to the repo root, stopping there (not above)", () => {
	const r = repo();
	skill("repo", ".claude/skills", "at-root");
	skill("", ".claude/skills", "above-repo"); // outside the repo: must be ignored
	mkdirSync(join(r, "svc/api"), { recursive: true });
	skill("repo/svc", ".github/skills", "in-svc");
	expect(names(discoverRepoSkills(join(r, "svc/api"), root))).toEqual(["at-root", "in-svc"]);
});

test("outside a git repo only cwd itself is scanned", () => {
	skill("plain", ".claude/skills", "here");
	skill("", ".claude/skills", "parent");
	expect(names(discoverRepoSkills(join(root, "plain"), root))).toEqual(["here"]);
});

test("nearer directories win on a name clash; same name in two dirs listed once", () => {
	const r = repo();
	skill("repo", ".claude/skills", "dup", "root version");
	mkdirSync(join(r, "svc"), { recursive: true });
	skill("repo/svc", ".gemini/skills", "dup", "svc version");
	const found = discoverRepoSkills(join(r, "svc"), root);
	expect(found).toHaveLength(1);
	expect(found[0].description).toBe("svc version");
});

test("falls back to the directory name; skips dirs without SKILL.md and unreadable junk", () => {
	const r = repo();
	const p = join(r, ".claude/skills/nofm/SKILL.md");
	mkdirSync(join(p, ".."), { recursive: true });
	writeFileSync(p, "# just a body\n");
	mkdirSync(join(r, ".claude/skills/empty"), { recursive: true });
	writeFileSync(join(r, ".claude/skills/README.md"), "x");
	const found = discoverRepoSkills(r, root);
	expect(found.map((s) => s.name)).toEqual(["nofm"]);
	expect(found[0].description).toBe("");
});

test("missing cwd or no skills dirs returns an empty list", () => {
	expect(discoverRepoSkills(join(root, "nope"), root)).toEqual([]);
	expect(discoverRepoSkills(repo(), root)).toEqual([]);
});

// ---- agents: flat <dot>/agents/*.md files, usually prose with no frontmatter ----
const agent = (base: string, dir: string, file: string, body: string) => {
	const p = join(root, base, dir, "agents", file);
	mkdirSync(join(p, ".."), { recursive: true });
	writeFileSync(p, body);
	return p;
};

test("agents: plain-prose .md files are found; name = file name, description = Role line", () => {
	const r = repo();
	const p = agent("repo", ".github", "review-agent.md", "# Review Agent Persona\n\n**Role**: Validate code quality\n**Authority**: x\n");
	expect(discoverRepoSkills(r, root)).toEqual([
		{ name: "review-agent", description: "Validate code quality", filePath: p, baseDir: join(r, ".github/agents"), source: ".github/agents" },
	]);
});

test("agents: description falls back to the first heading, then to empty", () => {
	const r = repo();
	agent("repo", ".github", "a.md", "# Heading Only\n\ntext");
	agent("repo", ".github", "b.md", "just text, no heading");
	const d = Object.fromEntries(discoverRepoSkills(r, root).map((s) => [s.name, s.description]));
	expect(d).toEqual({ a: "Heading Only", b: "" });
});

test("agents: frontmatter name/description win; *.agent.md drops the .agent suffix", () => {
	const r = repo();
	agent("repo", ".github", "x.agent.md", "---\nname: custom\ndescription: from fm\n---\nbody");
	agent("repo", ".github", "plain.agent.md", "# P\n");
	expect(names(discoverRepoSkills(r, root))).toEqual(["custom", "plain"]);
	expect(discoverRepoSkills(r, root).find((s) => s.name === "custom")?.description).toBe("from fm");
});

test("agents: README.md and non-markdown files are ignored; every dot-dir is scanned", () => {
	const r = repo();
	agent("repo", ".github", "README.md", "# Readme");
	agent("repo", ".github", "notes.txt", "x");
	agent("repo", ".claude", "c.md", "# C");
	agent("repo", ".gemini", "g.md", "# G");
	agent("repo", ".agents", "a.md", "# A");
	expect(names(discoverRepoSkills(r, root))).toEqual(["a", "c", "g"]);
});

test("agents: a real skill wins a name clash with an agent file, in the same dir", () => {
	const r = repo();
	skill("repo", ".github/skills", "dup", "the skill");
	agent("repo", ".github", "dup.md", "# the agent");
	const found = discoverRepoSkills(r, root);
	expect(found).toHaveLength(1);
	expect(found[0].description).toBe("the skill");
});
