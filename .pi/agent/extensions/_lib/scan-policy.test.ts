// Run: bun test ~/.pi/agent/extensions/_lib/scan-policy.test.ts
import { expect, test } from "bun:test";
import { checkScan } from "./scan-policy";

const HOME = "/home/unop";
const CWD = "/home/unop/proj";
const blocked = (cmd: string) => checkScan(cmd, CWD, HOME) !== undefined;

test("recursive scans of broad roots are blocked", () => {
	for (const c of ["fd -e py /", "find / -name x", "rg foo /usr", "grep -rn foo /var", "du -sh /etc", "ls -R /", "tree /opt"])
		expect(blocked(c)).toBe(true);
});

test("targeted system subpaths are allowed", () => {
	for (const c of ["rg foo /usr/share/doc/x", "fd conf /etc/nginx", "find /var/log/app -name x", "grep -r foo /usr/lib/x", "du -sh /var/cache/x"])
		expect(blocked(c)).toBe(false);
});

test("non-recursive ls/grep are never blocked", () => {
	for (const c of ["ls /usr", "ls -la /var", "ls /", "grep foo /etc/hosts", "grep foo /var/log/syslog"])
		expect(blocked(c)).toBe(false);
});

test("rg/grep pattern that looks like a path is not treated as a path", () => {
	expect(blocked("rg / src")).toBe(false);
});

test("scratch dirs and home/cwd are fine", () => {
	for (const c of ["fd x /tmp", "rg foo", "fd x ~/code".replace("~", HOME), "rg foo ."]) expect(blocked(c)).toBe(false);
});

test("commands on later lines / after pipes are still seen", () => {
	expect(blocked("echo hi\nfind / -name x")).toBe(true);
	expect(blocked("echo a | rg 'a|b' /usr/lib")).toBe(false);
});
