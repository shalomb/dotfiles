/**
 * /gb and /gl — one fzf git browser (`gB` in ~/.config/bash/enabled/fzf-utils.sh),
 * two entry points with identical keys and legend:
 *   /gb [git log args]  Enter = show the commit
 *   /gl [git log args]  Enter = diff commit..HEAD   (GB_MODE=diff)
 * Opens in a tmux popup at the repo root. No agent turn, no tokens.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerShared } from "./_lib/subcommands.ts";
import { splitArgs } from "./_lib/args.ts";

export default function (pi: ExtensionAPI) {
  const register = (name: string, mode: "show" | "diff", title: string, description: string) =>
    registerShared(pi, name, {
      description,
      handler: async (args: string, ctx: any) => {
        const notify = (m: string, l: "info" | "error" = "info") => ctx.ui.notify(m, l);
        if (!process.env.TMUX) return notify(`/${name} needs a tmux session (popup).`, "error");
        const root = await pi.exec("git", ["-C", ctx.cwd, "rev-parse", "--show-toplevel"], { timeout: 5000 });
        if (root.code !== 0) return notify(`Not a git repository: ${ctx.cwd}`, "error");

        const lib = `${process.env.HOME}/.config/bash/enabled/fzf-utils.sh`;
        const extra = splitArgs(args);
        // fzf-utils.sh returns early unless stdin is a tty; the popup provides one.
        const script = `source "$1" || exit 1; declare -F gB >/dev/null || { echo "gB not defined (is stdin a tty?)"; read -rsn1; exit 1; }; shift; if ! git rev-parse --verify --quiet HEAD >/dev/null && [ $# -eq 0 ]; then echo "No commits yet."; read -rsn1 -p "press any key"; exit 0; fi; GB_MODE=${mode} gB "$@"; rc=$?; (( rc == 130 || rc == 1 )) && rc=0; exit $rc`;
        const res = await pi.exec("tmux", [
          "display-popup", "-E", "-d", root.stdout.trim(), "-w", "98%", "-h", "98%", "-T", title,
          "bash", "-c", script, "_", lib, ...extra,
        ]);
        if (res.code !== 0) notify(`/${name} popup failed (${res.code}): ${res.stderr.trim()}`, "error");
      },
    });

  register("gb", "show", " gB: git browser ", "fzf git browser in a tmux popup (Enter = show commit). Args go to git log.");
  register("gl", "diff", " gL: commit vs HEAD ", "fzf git browser in a tmux popup (Enter = diff commit..HEAD). Args go to git log.");
}
