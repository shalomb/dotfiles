/** Tests for worktree discovery using real git repos */
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gitFacts, deriveRepo } from "./registry";

let testRoot: string;

beforeEach(() => {
	testRoot = mkdtempSync(join(tmpdir(), "git-test-"));
});

afterEach(() => {
	if (testRoot) rmSync(testRoot, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): void {
	const env = {
		...process.env,
		GIT_CONFIG_GLOBAL: "/dev/null",
		GIT_CONFIG_SYSTEM: "/dev/null",
		GIT_AUTHOR_NAME: "Test",
		GIT_AUTHOR_EMAIL: "test@test.com",
		GIT_COMMITTER_NAME: "Test",
		GIT_COMMITTER_EMAIL: "test@test.com"
	};
	const r = spawnSync("git", args, { cwd, env, encoding: "utf8" });
	if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
}

function makeRepo(name: string): string {
	const repoPath = join(testRoot, name);
	mkdirSync(repoPath, { recursive: true });
	git(repoPath, "init");
	git(repoPath, "config", "commit.gpgsign", "false");
	git(repoPath, "config", "core.hooksPath", "/dev/null");
	writeFileSync(join(repoPath, "README"), "test");
	git(repoPath, "add", "README");
	git(repoPath, "commit", "-m", "initial");
	return repoPath;
}

describe("gitFacts worktree discovery", () => {
	test("main repo returns repo path, no worktree", () => {
		const repo = makeRepo("main");
		git(repo, "checkout", "-b", "develop");
		
		const facts = gitFacts(repo);
		expect(facts.branch).toBe("develop");
		expect(facts.repo).toBe(repo);
		expect(facts.worktree).toBeUndefined();
		expect(facts.worktreePath).toBe(repo);
		expect(facts.isLinked).toBe(false);
	});

	test("linked worktree returns main repo and worktree name", () => {
		const repo = makeRepo("main");
		const wtPath = join(testRoot, "worktrees", "feat-x");
		git(repo, "worktree", "add", "-b", "feat/x", wtPath);
		
		const facts = gitFacts(wtPath);
		expect(facts.branch).toBe("feat/x");
		expect(facts.repo).toBe(repo);
		expect(facts.worktree).toBe("feat-x");
		expect(facts.worktreePath).toBe(wtPath);
		expect(facts.isLinked).toBe(true);
	});

	test("subdirectory of worktree returns correct worktree info", () => {
		const repo = makeRepo("main");
		const wtPath = join(testRoot, "worktrees", "feat-y");
		git(repo, "worktree", "add", "-b", "feat/y", wtPath);
		
		const subdir = join(wtPath, "src", "lib");
		mkdirSync(subdir, { recursive: true });
		
		const facts = gitFacts(subdir);
		expect(facts.branch).toBe("feat/y");
		expect(facts.repo).toBe(repo);
		expect(facts.worktree).toBe("feat-y");
		expect(facts.worktreePath).toBe(wtPath);
		expect(facts.isLinked).toBe(true);
	});

	test("non-git directory returns empty facts", () => {
		const nonGit = join(testRoot, "not-a-repo");
		mkdirSync(nonGit);
		
		const facts = gitFacts(nonGit);
		expect(facts.branch).toBeUndefined();
		expect(facts.repo).toBeUndefined();
		expect(facts.worktree).toBeUndefined();
		expect(facts.worktreePath).toBeUndefined();
		expect(facts.isLinked).toBeUndefined();
	});

	test("missing directory returns empty facts", () => {
		const missing = join(testRoot, "does-not-exist");
		
		const facts = gitFacts(missing);
		expect(facts.branch).toBeUndefined();
		expect(facts.repo).toBeUndefined();
		expect(facts.worktree).toBeUndefined();
		expect(facts.worktreePath).toBeUndefined();
		expect(facts.isLinked).toBeUndefined();
	});
});

describe("deriveRepo fallback for deleted worktrees", () => {
	test("path-based fallback still works", () => {
		const result = deriveRepo("/home/user/project/.worktrees/feat-z");
		expect(result.repo).toBe("/home/user/project");
		expect(result.worktree).toBe("feat-z");
	});

	test("path-based fallback handles nested worktrees dir", () => {
		const result = deriveRepo("/repos/dotfiles/.worktrees/test-branch/subdir");
		expect(result.repo).toBe("/repos/dotfiles");
		expect(result.worktree).toBe("test-branch");
	});

	test("non-worktree path returns cwd as repo", () => {
		const result = deriveRepo("/home/user/regular-repo");
		expect(result.repo).toBe("/home/user/regular-repo");
		expect(result.worktree).toBeNull();
	});
});
