/**
 * /git <sub> [args] — one entry point for the git views, with dropdown completion
 * for subcommands and their arguments. No agent turn. Existing commands stay as aliases.
 *   since · diff · changes · log (= /gb) · logdiff (= /gl) · lg (lazygit popup)
 * Subcommands are resolved at call time from extensions that publish via registerShared
 * (_lib/subcommands.ts, tested), so load order doesn't matter and a missing one just disappears.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { complete, dispatch, fromShared, type SubTree } from "./_lib/subcommands.ts";

export default function (pi: ExtensionAPI) {
  const lg = {
    description: "lazygit in a tmux popup (args forwarded, e.g. log, branch)",
    complete: (p: string) =>
      ["status", "branch", "log", "stash"].filter((o) => o.startsWith(p)).map((o) => ({ value: o, label: o })),
    handler: async (args: string, ctx: any) => {
      if (!process.env.TMUX) return ctx.ui.notify("/git lg needs a tmux session (popup).", "error");
      const root = await pi.exec("git", ["-C", ctx.cwd, "rev-parse", "--show-toplevel"], { timeout: 5000 });
      if (root.code !== 0) return ctx.ui.notify(`Not a git repository: ${ctx.cwd}`, "error");
      const res = await pi.exec("tmux", [
        "display-popup", "-E", "-d", root.stdout.trim(), "-w", "90%", "-h", "90%", "-T", " lazygit ",
        "lazygit", ...args.split(/\s+/).filter(Boolean),
      ]);
      if (res.code !== 0) ctx.ui.notify(`lazygit popup failed (${res.code}): ${res.stderr.trim()}`, "error");
    },
  };

  const tree = (): SubTree => {
    const t: SubTree = {};
    for (const [sub, name] of [["since", "since"], ["diff", "diff"], ["changes", "changes"], ["log", "gb"], ["logdiff", "gl"]]) {
      const s = fromShared(name);
      if (s) t[sub] = s;
    }
    t.lg = fromShared("lazygit") ?? lg; // full /lg (diff review layout) when loaded
    return t;
  };

  pi.registerCommand("git", {
    description: "Git views (no agent turn): since · diff · changes · log · logdiff · lg",
    getArgumentCompletions: (text: string) => complete(tree(), text),
    handler: (args: string, ctx: any) =>
      dispatch(tree(), args, ctx, (rest) =>
        ctx.ui.notify(`/git: ${rest ? `unknown subcommand '${rest.split(/\s/)[0]}'. ` : ""}Use: ${Object.keys(tree()).join(" · ")}`, rest ? "error" : "info")),
  });
}
