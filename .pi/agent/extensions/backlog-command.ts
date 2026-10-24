/**
 * Backlog awareness + claim/close loop for todo-navigator backlogs. No model turns of its own.
 *  - session_start: owner = pi:<session8>, the same default the todo CLI derives from $PI_SESSION_ID.
 *  - before_agent_start: adds a short "backlog" system-prompt section (open count, your claims,
 *    others' claims, next ready, protocol) when the repo has a backlog. `todo brief --json`, cached 30 s.
 *  - tool_result (bash `git commit`, success): appends a reminder to the result naming the tasks this
 *    session holds, so the agent runs `todo done|release`. Commits, branches and PRs stay untouched.
 *  - /backlog: show the brief; `/backlog off|on` toggles the injection for this session.
 * Pure logic: _lib/backlog.ts (tested). Backlog storage/locking: the `todo` CLI.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { backlogSection, commitNudge, isGitCommit, ownerFor, type Brief } from "./_lib/backlog.ts";

const TTL_MS = 30_000;

export default function (pi: ExtensionAPI) {
  let owner = "";
  let enabled = true;
  let cache: { cwd: string; at: number; brief: Brief | null } | undefined;

  const fetchBrief = async (cwd: string, fresh = false): Promise<Brief | null> => {
    if (!fresh && cache && cache.cwd === cwd && Date.now() - cache.at < TTL_MS) return cache.brief;
    const r = await pi.exec("todo", ["brief", "--json", "--as", owner], { cwd, timeout: 5000 } as any);
    let brief: Brief | null = null;
    if (r.code === 0 && r.stdout.trim()) {
      try { brief = JSON.parse(r.stdout); } catch { brief = null; }
    }
    cache = { cwd, at: Date.now(), brief };
    return brief;
  };

  pi.on("session_start", async (_e: any, ctx: any) => {
    owner = ownerFor(ctx.sessionManager.getSessionId()); // == todo CLI default from $PI_SESSION_ID
    cache = undefined;
  });

  pi.on("before_agent_start", async (event: any, ctx: any) => {
    if (!enabled || !owner) return;
    const text = backlogSection(await fetchBrief(ctx.cwd), owner);
    if (text) event.systemPromptOptions.sections.backlog = text;
  });

  // After a successful commit, remind the agent (in the same tool result) to close/release what it
  // holds. The agent decides; nothing is written to the commit, branch or PR.
  pi.on("tool_result", async (event: any, ctx: any) => {
    if (event.toolName !== "bash" || event.isError || !isGitCommit(String(event.input?.command ?? ""))) return;
    const sha = await pi.exec("git", ["-C", ctx.cwd, "rev-parse", "--short", "HEAD"], { timeout: 5000 });
    if (sha.code !== 0) return;
    const b = await fetchBrief(ctx.cwd, true);
    const nudge = b && commitNudge(b.mine, sha.stdout.trim());
    if (!nudge) return;
    return { content: [...event.content, { type: "text", text: `\n[backlog] ${nudge}` }] };
  });

  pi.registerCommand("backlog", {
    description: "Backlog brief for this repo (todo-navigator). `off`/`on` toggles prompt injection.",
    getArgumentCompletions: (p: string) => {
      const o = ["on", "off"].filter((x) => x.startsWith(p));
      return o.length ? o.map((x) => ({ value: x, label: x })) : null;
    },
    handler: async (args: string, ctx: any) => {
      const a = args.trim();
      if (a === "off" || a === "on") {
        enabled = a === "on";
        return ctx.ui.notify(`backlog injection ${a} for this session`, "info");
      }
      const b = await fetchBrief(ctx.cwd, true);
      ctx.ui.notify(b ? backlogSection(b, owner)!.split("\n")[0] : "No backlog for this repo (todo add … to start one).", "info");
    },
  });
}
