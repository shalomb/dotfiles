/**
 * /diff [git diff args] — scrollable git diff in a tmux popup via delta.
 * Default: unstaged changes (what an agent just edited). Any `git diff` args work
 * (HEAD~1, origin/main, a..b, -- path). Shortcuts: `staged` = --cached, `all` = HEAD.
 * Untracked files aren't diffed (use `git add -N`).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerShared } from "./_lib/subcommands.ts";
import { splitArgs } from "./_lib/args.ts";

export default function (pi: ExtensionAPI) {
  registerShared(pi, "diff", {
    description: "Show git diff (unstaged; `staged`, `all`) in a delta popup (no agent turn).",
    handler: async (args: string, ctx: any) => {
      const notify = (m: string, l: "info" | "error" = "info") => ctx.ui.notify(m, l);
      if (!process.env.TMUX) return notify("/diff needs a tmux session (popup).", "error");
      const root = await pi.exec("git", ["-C", ctx.cwd, "rev-parse", "--show-toplevel"], { timeout: 5000 });
      if (root.code !== 0) return notify(`Not a git repository: ${ctx.cwd}`, "error");

      // Everything is passed through to `git diff` (e.g. HEAD~1, origin/main..HEAD, --stat, -- path).
      // Shortcuts: a leading `staged` -> --cached, `all` -> HEAD.
      const tokens = splitArgs(args);   // quotes group: /diff -- "my dir/f 1.ts"
      const alias: Record<string, string> = { staged: "--cached", all: "HEAD" };
      const gitArgs = tokens.map((t, i) => (i === 0 && alias[t]) || t);
      const label = tokens.join(" ") || "unstaged";
      const q = (a: string) => `'${a.replace(/'/g, `'\\''`)}'`;
      const g = (...pre: string[]) => `git -C ${q(root.stdout.trim())} diff ${pre.join(" ")} ${gitArgs.map(q).join(" ")}`;
      // --quiet goes before user args so a user `--` can't turn it into a path.
      // LESS=-R drops any user -F; empty diff or error waits for a key instead of vanishing.
      const script =
        `${g("--quiet")} 2>/dev/null; rc=$?; ` +
        `if [ $rc -eq 0 ]; then echo ${q(`No changes (${label}).`)}; read -rsn1 -p 'press any key'; ` +
        `elif [ $rc -eq 1 ]; then ${g()} | LESS=-R delta --side-by-side --paging=always; ` +
        `else ${g()}; read -rsn1 -p 'git diff failed - press any key'; fi`;
      const res = await pi.exec("tmux", [
        "display-popup", "-E", "-d", root.stdout.trim(), "-w", "98%", "-h", "98%", "-T", " git diff ",
        "bash", "-c", script,
      ]);
      if (res.code !== 0) notify(`diff popup failed (${res.code}): ${res.stderr.trim()}`, "error");
    },
  });
}
