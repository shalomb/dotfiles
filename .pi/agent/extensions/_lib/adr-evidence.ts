import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export type EvidenceItem =
  | { kind: "commit" | "test" | "check"; value: string }
  | { kind: "unparseable"; value: string };
export type Failure = { file: string; reason: string };

/** Lines outside fenced code blocks, so a `#` in a fence never ends a section. */
function prose(md: string): string[] {
  let fenced = false;
  return md.split("\n").map((l) => {
    if (/^\s*(```|~~~)/.test(l)) { fenced = !fenced; return ""; }
    return fenced ? "" : l;
  });
}

function normalise(word: string | undefined): string | null {
  if (!word) return null;
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

export function parseStatus(md: string): string | null {
  const lines = prose(md);
  for (const l of lines) {
    const m = l.replace(/[*_]/g, "").match(/^-\s*Status\s*:\s*([A-Za-z]+)/i);
    if (m) return normalise(m[1]);
  }
  const i = lines.findIndex((l) => /^##\s+Status\s*$/i.test(l));
  if (i < 0) return null;
  for (const l of lines.slice(i + 1)) {
    if (/^#/.test(l)) return null;
    const t = l.replace(/[*_]/g, "").trim();
    if (t) return normalise(t.match(/^[A-Za-z]+/)?.[0]);
  }
  return null;
}

const NOTE = String.raw`(?:\s+(?:—|--|-)\s+.*)?\s*$`;
const GRAMMAR: [EvidenceItem["kind"], RegExp][] = [
  ["commit", new RegExp(String.raw`^- commit:\s*([0-9a-f]{4,40})` + NOTE)],
  ["test", new RegExp(String.raw`^- test:\s*(\S+)` + NOTE)],
  ["check", new RegExp(String.raw`^- check:\s*` + "`([^`]+)`" + NOTE)],
];

/** Every bullet under Evidence must match the grammar; anything else is an unparseable item. */
export function parseEvidence(md: string): EvidenceItem[] | null {
  const lines = prose(md);
  const i = lines.findIndex((l) => /^##\s+Evidence\s*$/.test(l));
  if (i < 0) return null;
  const items: EvidenceItem[] = [];
  for (const l of lines.slice(i + 1)) {
    if (/^#/.test(l)) break;
    if (!/^\s*[-*+]\s/.test(l)) continue;
    const hit = GRAMMAR.map(([kind, re]) => [kind, l.match(re)] as const).find(([, m]) => m);
    items.push(hit ? { kind: hit[0], value: hit[1]![1] } as EvidenceItem : { kind: "unparseable", value: l.trim() });
  }
  return items;
}

export function resolveItem(item: EvidenceItem, root: string): boolean {
  if (item.kind === "unparseable") return false;
  if (item.kind === "test") {
    const p = resolve(root, item.value);
    const rel = relative(root, p);
    if (rel.startsWith("..") || rel === "") return false;
    return existsSync(p) && statSync(p).isFile();
  }
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
    const status = parseStatus(md);
    if (status === null) { out.push({ file, reason: "status unreadable" }); continue; }
    if (status !== "Accepted") continue;
    const items = parseEvidence(md);
    if (items === null) { out.push({ file, reason: "no Evidence section" }); continue; }
    if (items.length === 0) { out.push({ file, reason: "Evidence section has no items" }); continue; }
    const junk = items.filter((it) => it.kind === "unparseable");
    if (junk.length) { out.push({ file, reason: `unparseable: ${junk.map((j) => j.value).join("; ")}` }); continue; }
    const bad = items.filter((it) => !resolveItem(it, root));
    if (bad.length) out.push({ file, reason: `unresolved: ${bad.map((b) => `${b.kind}: ${b.value}`).join("; ")}` });
  }
  return out;
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: adr-evidence.ts <dir>"); process.exit(2); }
  const rp = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"]);
  if (rp.exitCode !== 0) { console.error("adr-evidence: not inside a git repository"); process.exit(2); }
  const root = rp.stdout.toString().trim();
  const fails = checkDir(dir, root);
  for (const f of fails) console.log(`${f.file}: ${f.reason}`);
  if (fails.length) process.exit(1);
  console.log(`ok: all Accepted ADRs in ${dir} cite resolvable evidence`);
}
