import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDir, parseEvidence, parseStatus, resolveItem } from "./adr-evidence";

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "adr-ev-"));
  dirs.push(d);
  return d;
}
function repo(): { root: string; sha: string } {
  const root = tmp();
  const run = (a: string[]) => Bun.spawnSync(a, { cwd: root, stdout: "pipe" });
  run(["git", "init", "-q"]);
  writeFileSync(join(root, "t.test.ts"), "");
  run(["git", "add", "."]);
  run(["git", "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-qm", "x"]);
  const sha = run(["git", "rev-parse", "HEAD"]).stdout.toString().trim();
  return { root, sha };
}

describe("parseStatus", () => {
  test("heading form", () => expect(parseStatus("# A\n\n## Status\n\nAccepted (2024)\n")).toBe("Accepted"));
  test("bullet form", () => expect(parseStatus("- **Status:** Accepted\n")).toBe("Accepted"));
  test("other status", () => expect(parseStatus("## Status\nProposed\n")).toBe("Proposed"));
  test("none", () => expect(parseStatus("hi")).toBeNull());
});

describe("parseEvidence", () => {
  test("no section", () => expect(parseEvidence("# x")).toBeNull());
  test("items with notes", () => {
    const md = "## Evidence\n- commit: abc123 — n\n- test: a/b.ts\n- check: `echo hi` — ok\n\n## Next\n- test: no\n";
    expect(parseEvidence(md)).toEqual([
      { kind: "commit", value: "abc123" },
      { kind: "test", value: "a/b.ts" },
      { kind: "check", value: "echo hi" },
    ]);
  });
});

describe("resolveItem", () => {
  test("commit", () => {
    const { root, sha } = repo();
    expect(resolveItem({ kind: "commit", value: sha }, root)).toBe(true);
    expect(resolveItem({ kind: "commit", value: "deadbeef" }, root)).toBe(false);
  });
  test("test file", () => {
    const { root } = repo();
    expect(resolveItem({ kind: "test", value: "t.test.ts" }, root)).toBe(true);
    expect(resolveItem({ kind: "test", value: "nope.ts" }, root)).toBe(false);
  });
  test("check", () => {
    const { root } = repo();
    expect(resolveItem({ kind: "check", value: "true" }, root)).toBe(true);
    expect(resolveItem({ kind: "check", value: "false" }, root)).toBe(false);
  });
});

describe("checkDir", () => {
  test("only Accepted ADRs are checked; failures have reasons", () => {
    const { root } = repo();
    const d = join(root, "adr");
    mkdirSync(d);
    writeFileSync(join(d, "ADR-1.md"), "## Status\nAccepted\n");
    writeFileSync(join(d, "ADR-2.md"), "## Status\nProposed\n");
    writeFileSync(join(d, "ADR-3.md"), "- **Status:** Accepted\n## Evidence\n- test: t.test.ts\n");
    writeFileSync(join(d, "ADR-4.md"), "## Status\nAccepted\n## Evidence\n- test: missing\n");
    const f = checkDir(d, root);
    expect(f.map((x) => x.file).sort()).toEqual(["ADR-1.md", "ADR-4.md"]);
    expect(f.every((x) => x.reason.length > 0)).toBe(true);
  });
});
