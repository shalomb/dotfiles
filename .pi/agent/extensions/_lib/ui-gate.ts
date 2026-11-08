/**
 * ui-gate — agent-driven UI must never land on a screen the user isn't looking at.
 * surface(kind, originPane): show now if the origin pane is active in the active window of an
 * attached session; otherwise park (bell + @pi_attn pane flag, no UI). Child processes never surface.
 * Pure helpers here; extensions do the tmux exec.
 */
export type PaneState = { attached: boolean; windowActive: boolean; paneActive: boolean };

const CHILD_ENV = ["PI_SUBAGENT", "PI_BG_TASK", "PI_FUSION", "PI_CHILD"];

export const isChildProcess = (env: Record<string, string | undefined>, hasUI: boolean): boolean =>
  !hasUI || CHILD_ENV.some((k) => !!env[k]);

export const decide = (s: PaneState | undefined): "show" | "park" =>
  s && s.attached && s.windowActive && s.paneActive ? "show" : "park";

export const visibleQuery = (pane: string): string[] =>
  ["display-message", "-p", "-t", pane, "#{session_attached}|#{window_active}|#{pane_active}"];

export const parseVisible = (out: string): PaneState | undefined => {
  const p = out.trim().split("|");
  if (p.length !== 3) return undefined;
  return { attached: Number(p[0]) > 0, windowActive: p[1] === "1", paneActive: p[2] === "1" };
};

export const popupTitle = (name: string, origin: string): string => ` ${name} · ${origin} `;

export const splitArgs = (pane: string, cwd: string, cmd: string): string[] =>
  ["split-window", "-t", pane, "-h", "-d", "-P", "-F", "#{pane_id}", "-l", "45%", "-c", cwd, "bash", "-c", cmd];

export const popupArgs = (pane: string, cwd: string, name: string, origin: string, cmd: string): string[] =>
  ["display-popup", "-t", pane, "-E", "-d", cwd, "-w", "98%", "-h", "98%", "-T", popupTitle(name, origin), "bash", "-c", cmd];

export const originQuery = (pane: string): string[] =>
  ["display-message", "-p", "-t", pane, "#{session_name}:#{window_index}.#{pane_index}"];

export const parkArgs = (pane: string, reason: string): [string[], string[]] => [
  ["run-shell", "-t", pane, `printf '\\a' > #{pane_tty}`],
  ["set-option", "-p", "-t", pane, "@pi_attn", reason],
];

type Exec = (cmd: string, args: string[], opts?: any) => Promise<{ code: number; stdout: string; stderr: string }>;

/** Decide and act. Returns "show" (caller opens the UI), "park" (flag set) or "skip" (child/no tmux). */
export async function surface(exec: Exec, reason: string, env = process.env, hasUI = true): Promise<"show" | "park" | "skip"> {
  const pane = env.TMUX_PANE;
  if (!env.TMUX || !pane || isChildProcess(env, hasUI)) return "skip";
  const r = await exec("tmux", visibleQuery(pane), { timeout: 5000 });
  if (decide(r.code === 0 ? parseVisible(r.stdout) : undefined) === "show") return "show";
  for (const a of parkArgs(pane, reason)) await exec("tmux", a, { timeout: 5000 });
  return "park";
}

export type PopupOpts = { name: string; cwd: string; width?: string; height?: string; argv: string[] };
export type PopupResult = { status: "shown" | "parked" | "skip"; code?: number; stdout?: string; stderr?: string };

/** The one path for popups: gate on focus, target the origin pane, no timeout (display-popup -E blocks). */
export async function openPopup(exec: Exec, o: PopupOpts, env = process.env, hasUI = true): Promise<PopupResult> {
  const s = await surface(exec, `${o.name} ready`, env, hasUI);
  if (s === "skip") return { status: "skip" };
  if (s === "park") return { status: "parked" };
  const pane = env.TMUX_PANE!;
  const w = await exec("tmux", originQuery(pane), { timeout: 5000 });
  const origin = w.code === 0 && w.stdout.trim() ? w.stdout.trim() : pane;
  const args = ["display-popup", "-t", pane, "-E", "-d", o.cwd, "-w", o.width ?? "98%", "-h", o.height ?? "98%", "-T", popupTitle(o.name, origin), ...o.argv];
  const r = await exec("tmux", args);
  return { status: "shown", code: r.code, stdout: r.stdout, stderr: r.stderr };
}

export type SplitResult = { status: "shown" | "parked" | "skip"; paneId?: string; code?: number; stderr?: string };

/** Gated split pane beside the origin pane (non-blocking, so the normal timeout applies). */
export async function openSplit(exec: Exec, o: { name: string; cwd: string; cmd: string }, env = process.env, hasUI = true): Promise<SplitResult> {
  const s = await surface(exec, `${o.name} ready`, env, hasUI);
  if (s !== "show") return { status: s };
  const r = await exec("tmux", splitArgs(env.TMUX_PANE!, o.cwd, o.cmd), { timeout: 5000 });
  return { status: "shown", paneId: r.stdout.trim(), code: r.code, stderr: r.stderr };
}
