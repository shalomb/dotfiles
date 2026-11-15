// Tests for uv-policy.ts. Run: cd .pi/agent/extensions/_lib && bun test uv-policy
import { expect, test } from "bun:test";
import { uvViolation } from "./uv-policy";

const v = (c: string) => uvViolation(c);

test("allows ordinary and uv commands", () => {
	for (const c of ["uv run pytest", "uv add requests", "uv pip install x", "python script.py", "echo pip", "rg 'pip install' .", "ls | wc -l", "python -m pytest", "python -m ast f.py"]) expect(v(c)).toBeNull();
});

test("blocks pip, pip3, with the uv replacement", () => {
	expect(v("pip install x")?.rule).toBe("pip");
	expect(v("pip3 install x")?.rule).toBe("pip");
	expect(v("pip install x")?.use).toContain("uv add");
});

test("blocks pip behind paths, prefixes and later segments", () => {
	expect(v("cd x && .venv/bin/pip install y")?.rule).toBe("pip");
	expect(v("FOO=1 pip install y")?.rule).toBe("pip");
	expect(v("echo hi\npip list")?.rule).toBe("pip");
	expect(v("sh -c 'pip install y'")?.rule).toBe("pip");
});

test("blocks poetry", () => {
	expect(v("poetry add x")?.rule).toBe("poetry");
	expect(v("poetry add x")?.use).toContain("uv add");
});

test("blocks python -m pip / venv / py_compile, incl. versions and explicit paths", () => {
	expect(v("python -m pip install x")?.rule).toBe("python -m pip");
	expect(v("python3.12 -mpip install x")?.rule).toBe("python -m pip");
	expect(v(".venv/bin/python -m venv .v")?.rule).toBe("python -m venv");
	expect(v("python3 -m py_compile a.py")?.rule).toBe("python -m py_compile");
	expect(v("python -m py_compile a.py")?.use).toContain("python -m ast");
});

test("blocks virtualenv, easy_install, pipx, conda-style installers", () => {
	expect(v("virtualenv .v")?.rule).toBe("virtualenv");
	expect(v("pipx install x")?.rule).toBe("pipx");
});

test("does not trip on quoted mentions", () => {
	expect(v("rg 'a|pip' f")).toBeNull();
	expect(v("echo \"; pip install\"")).toBeNull();
	expect(v("git commit -m 'drop pip'")).toBeNull();
});

test("every rule explains why", () => {
	expect(v("pip i x")?.why.length).toBeGreaterThan(5);
});
