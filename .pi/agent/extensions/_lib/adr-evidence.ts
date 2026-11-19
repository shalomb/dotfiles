import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type EvidenceItem = { kind: "commit" | "test" | "check"; value: string };
export type Failure = { file: string; reason: string };

export function parseStatus(md: string): string | null {
  const bullet = md.match(/^- \*\*Status:\*\*\s*(\S+)/m);
  if (bullet) return bullet[1];
  const lines = md.split("\n");
  const i = lines.findIndex((l) => /^##\s+Status\s*$/.test(l));
  if (i < 0) return null;
  for (const l of lines.slice(i + 1)) {
    if (/^#/.test(l)) return null;
    const t = l.trim();
    if (t) return t.match(/^[A-Za-z]+/)?.[0] ?? null;
  }
  return null;
}

export function parseEvidence(md: string): EvidenceItem[] | null {
  const lines = md.split("\n");
  const i = lines.findIndex((l) => /^##\s+Evidence\s*$/.test(l));
  if (i < 0) return null;
  const items: EvidenceItem[] = [];
  for (const l of lines.slice(i + 1)) {
    if (/^#/.test(l)) break;
    let m = l.match(/^- commit:\s*([0-9a-fA-F]+)/);
    if (m) { items.push({ kind: "commit", value: m[1] }); continue; }
    m = l.match(/^- test:\s*(\S+)/);
    if (m) { items.push({ kind: "test", value: m[1] }); continue; }
    m = l.match(/^- check:\s*`([^`]+)`/);
    if (m) items.push({ kind: "check", value: m[1] });
  }
  return items;
}

export function resolveItem(item: EvidenceItem, root: string): boolean {
  if (item.kind === "test") return existsSync(join(root, item.value));
  const argv =
    item.kind === "commit"
      ? ["git", "cat-file", "-e", `${item.value}^{commit}`]
      : ["sh", "-c", item.value];
  const r = Bun.spawnSync(argv, { cwd: root, stdout: "ignore", stderr: "ignore", timeout: 60_000 });
  return r.exitCode === 0;
}

export function checkDir(dir: string, root: string): Failure[] {
  const out: Failure[] = [];
  for (const file of readdirSync(dir).filter((f) => /^ADR-.*\.md$/.test(f)).sort()) {
    const md = readFileSync(join(dir, file), "utf8");
    if (parseStatus(md) !== "Accepted") continue;
    const items = parseEvidence(md);
    if (items === null) { out.push({ file, reason: "no Evidence section" }); continue; }
    if (items.length === 0) { out.push({ file, reason: "Evidence section has no items" }); continue; }
    const bad = items.filter((it) => !resolveItem(it, root));
    if (bad.length) out.push({ file, reason: `unresolved: ${bad.map((b) => `${b.kind}: ${b.value}`).join("; ")}` });
  }
  return out;
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: adr-evidence.ts <dir>"); process.exit(2); }
  const root = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"]).stdout.toString().trim();
  const fails = checkDir(dir, root);
  for (const f of fails) console.log(`${f.file}: ${f.reason}`);
  if (fails.length) process.exit(1);
  console.log(`ok: all Accepted ADRs in ${dir} cite resolvable evidence`);
}
