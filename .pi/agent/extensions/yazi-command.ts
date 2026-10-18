/**
 * /yazi and /fm — open yazi in a blocking tmux popup. No agent turn, no tokens.
 * Args: optional start path (default: cwd). Files chosen in yazi (Enter/open)
 * are appended to the prompt editor as @path references.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

export default function (pi: ExtensionAPI) {
  const run = async (args: string, ctx: any) => {
    const notify = (m: string, l: "info" | "error" = "info") => ctx.ui.notify(m, l);
    if (!process.env.TMUX) return notify("/yazi needs a tmux session (popup).", "error");

    const start = resolve(ctx.cwd, args.trim() || ".");
    const dir = mkdtempSync(join(tmpdir(), "pi-yazi-"));
    const chooser = join(dir, "chosen");
    try {
      const res = await pi.exec("tmux", [
        "display-popup", "-E", "-d", ctx.cwd, "-w", "95%", "-h", "95%", "-T", " yazi ",
        "yazi", `--chooser-file=${chooser}`, start,
      ]);
      if (res.code !== 0) return notify(`yazi popup failed (${res.code}): ${res.stderr.trim() || "is yazi installed?"}`, "error");

      let chosen: string[] = [];
      try { chosen = readFileSync(chooser, "utf8").split("\n").filter(Boolean); } catch {}
      if (!chosen.length) return notify("yazi closed — nothing selected");

      const refs = chosen.map((p) => {
        const rel = relative(ctx.cwd, p);
        const path = rel && !rel.startsWith("..") ? rel : p;
        return `@${/\s/.test(path) ? `"${path}"` : path}`;
      });
      const cur = ctx.ui.getEditorText?.() ?? "";
      ctx.ui.setEditorText(`${cur}${cur && !cur.endsWith(" ") ? " " : ""}${refs.join(" ")} `);
      notify(`yazi: added ${refs.length} path(s) to prompt`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  for (const name of ["yazi", "fm"]) {
    pi.registerCommand(name, {
      description: "Open yazi in a tmux popup (no agent turn). Selected files are added to the prompt as @refs.",
      handler: run,
    });
  }
}
