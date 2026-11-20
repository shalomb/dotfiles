// Pure epic/initiative dashboard HTML from plain data. No I/O.
export type Status = "todo" | "in-progress" | "blocked" | "done";
export interface Item { key: string; title: string; status: Status; blockedBy?: string[] }
export interface DashboardInput { title: string; items: Item[] }
export type Health = "on-track" | "at-risk" | "off-track";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function summarize(items: Item[]) {
  const counts: Record<Status, number> = { todo: 0, "in-progress": 0, blocked: 0, done: 0 };
  for (const i of items) counts[i.status]++;
  const total = items.length;
  const percentDone = total ? Math.round((counts.done / total) * 100) : 0;
  const blockers = items.filter((i) => i.status === "blocked").map((i) => i.key);
  const ratio = total ? blockers.length / total : 0;
  const health: Health = ratio >= 0.5 ? "off-track" : blockers.length > 0 ? "at-risk" : "on-track";
  return { total, counts, wip: counts["in-progress"], percentDone, blockers, health };
}

export function renderDashboard(input: DashboardInput): string {
  const s = summarize(input.items);
  const rows = input.items
    .map((i) => `<tr class="${i.status}"><td>${esc(i.key)}</td><td>${esc(i.title)}</td><td>${i.status}</td><td>${esc((i.blockedBy ?? []).join(", "))}</td></tr>`)
    .join("");
  return `<section class="dashboard"><h1>${esc(input.title)}</h1>
<p class="health ${s.health}">Health: ${s.health}</p>
<div class="bar"><div style="width:${s.percentDone}%"></div></div>
<p>${s.percentDone}% done · WIP ${s.wip} · blocked ${s.blockers.length} of ${s.total}</p>
<table><tr><th>Key</th><th>Title</th><th>Status</th><th>Blocked by</th></tr>${rows}</table></section>`;
}
