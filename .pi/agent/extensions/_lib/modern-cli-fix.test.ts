// Tests for modern-cli-fix.ts. Run: cd .pi/agent/extensions/_lib && bun test modern-cli-fix
import { expect, test } from "bun:test";
import { fixFor } from "./modern-cli-fix";

const fix = (cmd: string[], piped = false) => fixFor(cmd, piped);

test("sed -n 'A,Bp' FILE -> read tool call with offset/limit", () => {
	expect(fix(["sed", "-n", "10,40p", "a.ts"])).toBe("the `read` tool: path=a.ts offset=10 limit=31");
	expect(fix(["sed", "-n", "5p", "a.ts"])).toBe("the `read` tool: path=a.ts offset=5 limit=1");
	expect(fix(["sed", "-n", "100,$p", "a.ts"])).toBe("the `read` tool: path=a.ts offset=100");
});

test("sed -n range in a pipe -> tail/head", () => {
	expect(fix(["sed", "-n", "2p"], true)).toBe("tail -n +2 | head -n 1");
	expect(fix(["sed", "-n", "3,5p"], true)).toBe("tail -n +3 | head -n 3");
});

test("sed s///g in a pipe -> sd, quoting the pattern", () => {
	expect(fix(["sed", "s/a b/c/g"], true)).toBe("sd 'a b' 'c'");
	expect(fix(["sed", "-E", "s|x|y|g"], true)).toBe("sd 'x' 'y'");
});

test("sed -i -> sd on the files; sed s/// FILE without -i -> sd < FILE (sd edits in place)", () => {
	expect(fix(["sed", "-i", "s/x/y/g", "f1", "f2"])).toBe("sd 'x' 'y' f1 f2");
	expect(fix(["sed", "s/x/y/g", "f1"])).toBe("sd 'x' 'y' < f1");
});

test("sed without g notes that sd replaces every match", () => {
	expect(fix(["sed", "s/x/y/"], true)).toContain("sd 'x' 'y'");
	expect(fix(["sed", "s/x/y/"], true)).toContain("every match");
});

test("grep -> rg with grep-only flags dropped", () => {
	expect(fix(["grep", "-rn", "foo", "src"])).toBe("rg -n foo src");
	expect(fix(["grep", "-r", "foo", "."])).toBe("rg foo .");
	expect(fix(["grep", "-E", "a|b"], true)).toBe("rg 'a|b'");
});

test("find -> fd", () => {
	expect(fix(["find", ".", "-name", "*.py"])).toBe("fd -g '*.py' .");
	expect(fix(["find", "src", "-type", "f", "-name", "*.ts"])).toBe("fd -t f -g '*.ts' src");
	expect(fix(["find", ".", "-maxdepth", "2", "-type", "d"])).toBe("fd -d 2 -t d . .");
});

test("returns null for forms it cannot translate safely", () => {
	expect(fix(["sed", "-e", "1d", "-e", "2d", "f"])).toBeNull();
	expect(fix(["find", ".", "-exec", "rm", "{}", ";"])).toBeNull();
	expect(fix(["sed", "y/abc/xyz/"], true)).toBeNull();
	expect(fix(["ls"])).toBeNull();
});
