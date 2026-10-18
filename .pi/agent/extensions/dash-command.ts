/**
 * /dash — open gh-dash in a blocking tmux popup. No agent turn, no tokens.
 * Args are forwarded to `gh dash` (e.g. `--config <path>`).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("dash", {
    description: "Open gh-dash (PRs/issues) in a tmux popup (no agent turn). Args forwarded to `gh dash`.",
    handler: async (args: string, ctx: any) => {
      const notify = (m: string, l: "info" | "error" = "info") => ctx.ui.notify(m, l);
      if (!process.env.TMUX) return notify("/dash needs a tmux session (popup).", "error");
      const extra = args.trim() ? args.trim().split(/\s+/) : [];
      const res = await pi.exec("tmux", [
        "display-popup", "-E", "-d", ctx.cwd, "-w", "95%", "-h", "95%", "-T", " gh dash ", "gh", "dash", ...extra,
      ]);
      if (res.code !== 0) notify(`gh dash popup failed (${res.code}): ${res.stderr.trim() || "is gh-dash installed?"}`, "error");
    },
  });
}
