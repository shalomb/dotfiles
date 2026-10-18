/**
 * /since [git diff args] — everything changed in the working tree since the session's baseline
 * (tracked + untracked, committed or not), in a delta popup. No agent turn.
 *   /since              diff baseline -> now
 *   /since --stat       any `git diff` args work (-- path, --name-only, ...)
 *   /since reset        re-take the baseline from the current state
 * The baseline is a tree object (no refs, no commits, real index untouched) taken at
 * session_start and stored in the session via appendEntry; resumed sessions keep theirs.
 * Unreferenced objects survive until git gc prunes them (default ~2 weeks).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { splitArgs } from "./_lib/args.ts";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Baseline = { root: string; tree: string; at: number };

export default function (pi: ExtensionAPI) {
  const script = join(dirname(fileURLToPath(import.meta.url)), "_lib", "since.sh");
  let baseline: Baseline | undefined;

  const repoRoot = async (cwd: string) => {
    const r = await pi.exec("git", ["-C", cwd, "rev-parse", "--show-toplevel"], { timeout: 5000 });
    return r.code === 0 ? r.stdout.trim() : undefined;
  };

  const capture = async (cwd: string) => {
    const root = await repoRoot(cwd);
    if (!root) return undefined;
    const r = await pi.exec("bash", [script, "snap", root], { timeout: 60000 });
    const tree = r.stdout.trim();
    if (r.code !== 0 || !tree) return undefined;
    baseline = { root, tree, at: Date.now() };
    pi.appendEntry("since-baseline", baseline);
    return baseline;
  };

  pi.on("session_start", async (_event, ctx) => {
    baseline = undefined;
    for (const entry of ctx.sessionManager.getEntries()) {
      if (entry.type === "custom" && entry.customType === "since-baseline") baseline = entry.data as Baseline;
    }
    if (!baseline) await capture(ctx.cwd);
  });

  pi.registerCommand("since", {
    description: "Diff the working tree against the session-start baseline (incl. untracked). `reset` re-baselines; other args go to git diff.",
    getArgumentCompletions: (prefix: string) => {
      const opts = ["reset", "--stat", "--name-only"].filter((o) => o.startsWith(prefix));
      return opts.length ? opts.map((o) => ({ value: o, label: o })) : null;
    },
    handler: async (args: string, ctx: any) => {
      const notify = (m: string, l: "info" | "error" = "info") => ctx.ui.notify(m, l);
      const root = await repoRoot(ctx.cwd);
      if (!root) return notify(`Not a git repository: ${ctx.cwd}`, "error");
      const tokens = splitArgs(args);

      if (tokens[0] === "reset") {
        const b = await capture(ctx.cwd);
        return b ? notify(`since: baseline reset (${b.tree.slice(0, 7)})`) : notify("since: could not snapshot the working tree", "error");
      }
      if (!baseline) {
        const b = await capture(ctx.cwd);
        return notify(b ? "since: no baseline existed; captured one now. Run /since after the agent edits." : "since: could not snapshot the working tree", b ? "info" : "error");
      }
      if (baseline.root !== root) return notify(`since: baseline is for ${baseline.root}; run /since reset to re-baseline here`, "error");
      if (!process.env.TMUX) return notify("/since needs a tmux session (popup).", "error");

      const at = new Date(baseline.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const res = await pi.exec("tmux", [
        "display-popup", "-E", "-d", root, "-w", "98%", "-h", "98%", "-T", ` since ${at} `,
        "bash", script, "diff", root, baseline.tree, ...tokens,
      ]);
      if (res.code !== 0) notify(`/since popup failed (${res.code}): ${res.stderr.trim()}`, "error");
    },
  });
}
