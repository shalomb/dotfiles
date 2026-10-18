/**
 * /jira and /jt — open jiratui in a blocking tmux popup. No agent turn, no tokens.
 *   /jira setup [N]       find projects you take part in (assignee/reporter/watcher),
 *                         write the top N (default 10) as default JQL into the jiratui config
 *   /jira                 open, searching your configured projects (if setup was run)
 *   /jira DRYFT-123       open on that work item
 *   /jira DRYFT           open filtered to one project
 *   /jira DRYFT,ECS1      open searching an ad-hoc set of projects
 *   /jira -j 2 ...        flags forwarded verbatim to `jiratui ui`
 * Config: ~/.config/jiratui/config.yaml (shared with the bash `jiratui` wrapper).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdtempSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const KEY = "[A-Z][A-Z0-9_]+";
const ADHOC_ID = 99;
const PARTICIPATION_JQL =
  "assignee = currentUser() OR assignee was currentUser() OR reporter = currentUser() OR watcher = currentUser() ORDER BY updated DESC";

export type Project = { key: string; name: string; count: number };

export function rankProjects(issues: any[]): Project[] {
  const by = new Map<string, Project>();
  for (const i of issues) {
    const p = i?.fields?.project;
    if (!p?.key) continue;
    const e = by.get(p.key) ?? { key: p.key, name: p.name ?? p.key, count: 0 };
    e.count++;
    by.set(p.key, e);
  }
  return [...by.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

const inProjects = (keys: string[]) => `project in (${keys.join(", ")})`;
// Deep-merge a JSON patch; jiratui looks expressions up by int id, and keep block style.
const merge = (patch: string) =>
  `. * load("${patch}") | .pre_defined_jql_expressions |= with_entries(.key |= to_number) | ... style=""`;

export function jqlConfig(keys: string[]) {
  const p = inProjects(keys);
  return {
    pi_jira_projects: keys,
    pre_defined_jql_expressions: {
      1: { label: "My projects (recently updated)", expression: `${p} ORDER BY updated DESC` },
      2: { label: "Mine, open, in my projects", expression: `${p} AND assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC` },
      3: { label: "Unassigned, open, in my projects", expression: `${p} AND assignee is EMPTY AND statusCategory != Done ORDER BY created DESC` },
    },
    jql_expression_id_for_work_items_search: 1,
    search_on_startup: true,
  };
}

export function jiratuiArgs(args: string, hasDefaultJql = false): string[] {
  const parts = args.trim() ? args.trim().split(/\s+/) : [];
  if (!parts.length) return hasDefaultJql ? ["ui", "-j", "1", "--search-on-startup"] : ["ui"];
  const [first, ...rest] = parts;
  if (new RegExp(`^${KEY}-\\d+$`).test(first)) return ["ui", "-w", first, "--search-on-startup", ...rest];
  if (new RegExp(`^${KEY}(,${KEY})+$`).test(first)) return ["ui", "-j", String(ADHOC_ID), "--search-on-startup", ...rest];
  if (new RegExp(`^${KEY}$`).test(first)) return ["ui", "-p", first, "--search-on-startup", ...rest];
  return ["ui", ...parts];
}

export default function (pi: ExtensionAPI) {
  const home = process.env.HOME;
  const config = `${home}/.config/jiratui/config.yaml`;
  const yq = async (expr: string, file = config) => (await pi.exec("yq", [expr, file], { timeout: 5000 })).stdout.trim();

  const setup = async (args: string, notify: (m: string, l?: "info" | "error") => void) => {
    const top = Number(args.trim()) || 10;
    const [base, user, token] = await Promise.all(
      ["jira_api_base_url", "jira_api_username", "jira_api_token"].map((k) => yq(`.${k} // ""`)),
    );
    if (!base || !user || !token) return notify(`jira setup: base url / username / token missing in ${config}`, "error");

    const auth = "Basic " + Buffer.from(`${user}:${token}`).toString("base64");
    const issues: any[] = [];
    let next: string | undefined;
    for (let page = 0; page < 5; page++) {
      const u = new URL(`${base.replace(/\/$/, "")}/rest/api/3/search/jql`);
      u.searchParams.set("jql", PARTICIPATION_JQL);
      u.searchParams.set("fields", "project");
      u.searchParams.set("maxResults", "100");
      if (next) u.searchParams.set("nextPageToken", next);
      const r = await fetch(u, { headers: { Authorization: auth, Accept: "application/json" } });
      if (!r.ok) return notify(`jira setup: Jira API ${r.status} (token expired? see ~/.netrc)`, "error");
      const body: any = await r.json();
      issues.push(...(body.issues ?? []));
      next = body.nextPageToken;
      if (!next || body.isLast) break;
    }
    const ranked = rankProjects(issues);
    if (!ranked.length) return notify("jira setup: no projects found for your user", "error");
    const keys = ranked.slice(0, top).map((p) => p.key);

    const dir = mkdtempSync(join(tmpdir(), "pi-jira-"));
    try {
      const patch = join(dir, "patch.json");
      writeFileSync(patch, JSON.stringify(jqlConfig(keys)));
      copyFileSync(config, `${config}.bak`);
      const res = await pi.exec("yq", ["-i", merge(patch), config], { timeout: 5000 });
      if (res.code !== 0) return notify(`jira setup: yq failed: ${res.stderr.trim()}`, "error");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    notify(
      `jira setup: ${keys.length} project(s) saved to ${config} (from ${issues.length} issues): ` +
        ranked.slice(0, top).map((p) => `${p.key}(${p.count})`).join(" ") +
        (ranked.length > top ? ` — skipped ${ranked.length - top} more; use /jira setup ${ranked.length}` : ""),
    );
  };

  const run = async (args: string, ctx: any) => {
    const notify = (m: string, l: "info" | "error" = "info") => ctx.ui.notify(m, l);
    if (!existsSync(config)) return notify(`jiratui config missing: ${config}`, "error");
    if (args.trim().split(/\s+/)[0] === "setup") return setup(args.trim().slice(5), notify);
    if (!process.env.TMUX) return notify("/jira needs a tmux session (popup).", "error");

    const hasDefault = (await yq(`.pre_defined_jql_expressions.1.expression // ""`)) !== "";
    const uiArgs = jiratuiArgs(args, hasDefault);
    // Not ~/.local/bin/jiratui: that wrapper hardcodes JIRA_TUI_CONFIG_FILE.
    const bin = ["uvx", "jiratui"];

    // Ad-hoc project list: temp config copy with an extra JQL expression.
    let cfg = config;
    let dir: string | undefined;
    if (uiArgs[2] === String(ADHOC_ID) && uiArgs[1] === "-j") {
      dir = mkdtempSync(join(tmpdir(), "pi-jira-"));
      cfg = join(dir, "config.yaml");
      const patch = join(dir, "patch.json");
      const keys = args.trim().split(/\s+/)[0].split(",");
      writeFileSync(patch, JSON.stringify({
        pre_defined_jql_expressions: { [ADHOC_ID]: { label: `Ad hoc: ${keys.join(", ")}`, expression: `${inProjects(keys)} ORDER BY updated DESC` } },
      }));
      const r = await pi.exec("bash", ["-c", 'umask 077; yq "$2" "$1" > "$3"', "_", config, merge(patch), cfg], { timeout: 5000 });
      if (r.code !== 0) { rmSync(dir, { recursive: true, force: true }); return notify(`/jira: yq failed: ${r.stderr.trim()}`, "error"); }
    }
    try {
      const res = await pi.exec("tmux", [
        "display-popup", "-E", "-d", ctx.cwd, "-w", "95%", "-h", "95%", "-T", " JiraTUI ",
        "-e", `JIRA_TUI_CONFIG_FILE=${cfg}`, ...bin, ...uiArgs,
      ]);
      if (res.code !== 0) notify(`/jira popup failed (${res.code}): ${res.stderr.trim() || "is jiratui installed?"}`, "error");
    } finally {
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  };

  for (const name of ["jira", "jt"]) {
    pi.registerCommand(name, {
      description: "Open jiratui in a tmux popup. `setup [N]` saves your projects as default JQL. Args: ISSUE-KEY | PROJ | PROJ1,PROJ2 | ui flags.",
      handler: run,
    });
  }
}
