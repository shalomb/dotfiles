/**
 * /changes — live diff panel beside pi (modelled on Claude Code's /diff panel). No agent turn.
 *   /changes            toggle the panel (right split, 45%)      shortcut: ctrl+alt+d
 *   /changes popup      same panel in a 98% popup
 *   /changes <ref>      start against a ref (HEAD~1, origin/main); default HEAD
 *   /changes attach     add files marked with ^a in the panel to the prompt as @refs
 *   /changes close      close the panel (and stop auto-opening)
 * Panel: foldable tree — file rows (▸/▾, ● = touched in the last 30s) with hunk rows under open files.
 *   ⏎/space/l/h fold · j/k move · J/K jump ±10 · g/G top/bottom · e/c expand/close all · b cycle base
 *   (session → HEAD → branch) · t tests+generated · s side-by-side · m mark file for prompt · p pager · q quit.
 *   Polls a cheap mtime/status signature every 1s (results cached per signature), and refreshes
 *   instantly after an agent edit/write/bash tool call. Cursor stays on its row across refreshes.
 * Auto-open: once you've opened the panel yourself, it reopens on the agent's first edit
 *   (tmux window ≥ 144 cols) until you close it. Preference lives in ~/.pi/agent/changes-state.json.
 * Rendering/UI lives in _lib/changes.sh (tested: _lib/changes.test.ts).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerShared } from "./_lib/subcommands.ts";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AUTO_MIN_COLS = 144;
const STATE_FILE = join(homedir(), ".pi", "agent", "changes-state.json");
const MARKED = join(process.env.XDG_RUNTIME_DIR || "/tmp", `pi-changes-marked-${process.pid}`);

const loadAuto = (): boolean => {
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")).auto === true; } catch { return false; }
};
const saveAuto = (auto: boolean) => {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify({ auto }));
};

export default function (pi: ExtensionAPI) {
  const script = join(dirname(fileURLToPath(import.meta.url)), "_lib", "changes.sh");
  let paneId: string | undefined;
  let port = 0;
  let sessionTree: string | undefined;
  let repoRoot: string | undefined;
  let autoShown = false; // auto-open at most once per session

  const tmux = (args: string[]) => pi.exec("tmux", args, { timeout: 5000 });
  const paneAlive = async () => {
    if (!paneId) return false;
    const r = await tmux(["display-message", "-p", "-t", paneId, "#{pane_id}"]);
    return r.code === 0 && r.stdout.trim() === paneId;
  };
  const gitRoot = async (cwd: string) => {
    const r = await pi.exec("git", ["-C", cwd, "rev-parse", "--show-toplevel"], { timeout: 5000 });
    return r.code === 0 ? r.stdout.trim() : undefined;
  };
  const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

  // Baseline = working tree at session start (same mechanism as /since), enables the "session" base.
  pi.on("session_start", async (_e: any, ctx: any) => {
    sessionTree = undefined;
    repoRoot = await gitRoot(ctx.cwd);
    if (!repoRoot) return;
    const since = join(dirname(script), "since.sh");
    const r = await pi.exec("bash", [since, "snap", repoRoot], { timeout: 60000 });
    if (r.code === 0 && r.stdout.trim()) sessionTree = r.stdout.trim();
  });

  const launch = async (ctx: any, base: string, popup: boolean) => {
    const notify = (m: string, l: "info" | "error" = "info") => ctx.ui.notify(m, l);
    const repo = repoRoot ?? (await gitRoot(ctx.cwd));
    if (!repo) return notify(`Not a git repository: ${ctx.cwd}`, "error");
    port = 20000 + Math.floor(Math.random() * 20000);
    const env =
      `CHANGES_PORT=${port} CHANGES_MARKED=${q(MARKED)}` +
      (sessionTree ? ` CHANGES_SESSION_TREE=${q(sessionTree)}` : "");
    const startMode = base === "HEAD" ? (sessionTree ? "session" : "head") : base;
    const cmd = `${env} bash ${q(script)} ui ${q(repo)} ${q(startMode)}`;
    if (popup) {
      const res = await tmux(["display-popup", "-E", "-d", repo, "-w", "98%", "-h", "98%", "-T", " changes ", "bash", "-c", cmd]);
      if (res.code !== 0) notify(`changes popup failed (${res.code}): ${res.stderr.trim()}`, "error");
      return;
    }
    const res = await tmux(["split-window", "-h", "-d", "-P", "-F", "#{pane_id}", "-l", "45%", "-c", repo, "bash", "-c", cmd]);
    if (res.code !== 0) return notify(`changes split failed (${res.code}): ${res.stderr.trim()}`, "error");
    paneId = res.stdout.trim();
  };

  const close = async () => {
    if (await paneAlive()) await tmux(["kill-pane", "-t", paneId!]);
    paneId = undefined;
  };

  const attach = async (ctx: any) => {
    let files: string[] = [];
    try { files = readFileSync(MARKED, "utf8").split("\n").filter(Boolean); } catch {}
    if (!files.length) return ctx.ui.notify("changes: no files marked (^a in the panel)", "info");
    const refs = files.map((p) => {
      const rel = ctx.cwd && p.startsWith(`${ctx.cwd}/`) ? p.slice(ctx.cwd.length + 1) : p;
      return `@${/\s/.test(rel) ? `"${rel}"` : rel}`;
    });
    const cur = ctx.ui.getEditorText?.() ?? "";
    ctx.ui.setEditorText(`${cur}${cur && !cur.endsWith(" ") ? " " : ""}${refs.join(" ")} `);
    rmSync(MARKED, { force: true });
    ctx.ui.notify(`changes: added ${refs.length} file(s) to prompt`);
  };

  const run = async (args: string, ctx: any) => {
    const notify = (m: string, l: "info" | "error" = "info") => ctx.ui.notify(m, l);
    if (!process.env.TMUX) return notify("/changes needs a tmux session.", "error");
    const [first, ...rest] = args.trim().split(/\s+/).filter(Boolean);

    if (first === "attach") return attach(ctx);
    if (first === "close" || (!first && (await paneAlive()))) {
      await close();
      saveAuto(false); // closing turns auto-open off until you open it again
      return notify("changes: closed");
    }
    const popup = first === "popup";
    const base = (popup ? rest[0] : first) ?? "HEAD";
    if (base.startsWith("-")) return notify("changes: base must be a ref, not an option", "error");
    if (!popup) saveAuto(true); // opening manually turns auto-open on
    await close();
    await launch(ctx, base, popup);
  };

  // Instant refresh + auto-open when the agent touches the working tree.
  pi.on("tool_result", async (event: any, ctx: any) => {
    const name = String(event.toolName ?? "");
    if (!["edit", "write", "bash"].includes(name)) return;
    if (await paneAlive()) {
      await pi.exec("bash", [script, "poke", "/", String(port)], { timeout: 3000 }).catch(() => {});
      return;
    }
    if (name === "bash" || autoShown || !process.env.TMUX || !loadAuto()) return;
    const w = await tmux(["display-message", "-p", "#{window_width}"]);
    if (Number(w.stdout.trim()) < AUTO_MIN_COLS) return;
    autoShown = true;
    await launch(ctx, "HEAD", false);
  });

  registerShared(pi, "changes", {
    description: "Live diff panel beside pi (toggle). Args: popup | attach | close | <base ref>.",
    getArgumentCompletions: (prefix: string) => {
      const opts = ["popup", "attach", "close", "HEAD~1", "origin/main"].filter((o) => o.startsWith(prefix));
      return opts.length ? opts.map((o) => ({ value: o, label: o })) : null;
    },
    handler: run,
  });
  pi.registerShortcut("ctrl+alt+d", { description: "Toggle live changes panel", handler: (ctx: any) => run("", ctx) });
  pi.registerShortcut("ctrl+alt+a", { description: "Attach marked changes to prompt", handler: (ctx: any) => attach(ctx) });
}
