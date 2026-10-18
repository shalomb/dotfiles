/**
 * Local git-gate installation (shared helper — NOT an extension).
 *
 * Installs a small generic dispatcher as the repo's pre-commit, commit-msg
 * and/or pre-push hook in the LOCAL git hooks dir (untracked: no repo files
 * change). What the dispatcher does lives in `pi-gates.json` inside the git
 * dir (per worktree), so changing a gate means editing data, not the hook.
 *
 * Callers must have confirmed with the user first and must have checked via
 * hooks-detect that no hook framework or native hook is already in charge.
 */

import { chmodSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Exec, HooksReport } from "./hooks-detect.ts";

export const GATE_HOOK_NAMES = ["pre-commit", "commit-msg", "pre-push"] as const;
export const MARKER = "pi-gates dispatcher";

export interface Gate {
	command: string;
	timeoutSec: number;
}

export interface GatesConfig {
	version: 1;
	/** Run at pre-commit. Keep this the cheap tier. */
	fast?: Gate;
	/** Run at pre-push. */
	full?: Gate;
	commitMsg: { conventional: boolean; noAiAttribution: boolean };
	/** Default true: refuse to run gates when the working tree has changes outside the commit. */
	requireCleanTree?: boolean;
}

export function renderDispatcher(): string {
	return `#!/bin/sh
# ${MARKER} — managed by pi \`/gates\`. Remove with \`/gates uninstall\`.
# Behaviour is read from pi-gates.json in this worktree's git dir; this file is generic.
hook=$(basename "$0")

# Chain to a hook that existed before installation.
if [ -x "$0.orig" ]; then "$0.orig" "$@" || exit $?; fi

# Hooks run with a minimal environment; make the usual tool locations visible.
PATH="$HOME/.cargo/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"; export PATH

cfg=$(git rev-parse --git-path pi-gates.json 2>/dev/null) || exit 0
[ -f "$cfg" ] || exit 0
command -v jq >/dev/null 2>&1 || { echo "pi-gates: jq not found, cannot read $cfg" >&2; exit 1; }

# The gate runs against the working tree, so the working tree must BE the content being
# committed/pushed. Otherwise tests could pass on code that is not in the commit (unstaged
# edits, untracked files) or fail on unrelated WIP. Fail closed unless requireCleanTree=false.
check_tree() {
  base=$1
  [ "$(jq -r '.requireCleanTree // true' "$cfg")" = true ] || return 0
  if [ "$base" = HEAD ]; then git diff --quiet HEAD; else git diff --quiet; fi
  dirty=$?
  untracked=$(git ls-files --others --exclude-standard)
  if [ "$dirty" -ne 0 ] || [ -n "$untracked" ]; then
    echo "pi-gates: the working tree has changes that are NOT part of this operation, so the gate would test content you are not committing:" >&2
    git status --short >&2
    echo "pi-gates: stage them, or stash them (git stash push --include-untracked), then retry. Do not bypass." >&2
    exit 1
  fi
}

run_gate() {
  label=$1; cmd=$2; secs=$3; base=$4
  [ -n "$cmd" ] || return 0
  check_tree "$base"
  echo "pi-gates: $label: $cmd" >&2
  # Drop git's hook-time env so tests that run git (or create temp repos) cannot touch this repo.
  if command -v timeout >/dev/null 2>&1; then
    env -u GIT_INDEX_FILE -u GIT_DIR -u GIT_WORK_TREE -u GIT_PREFIX timeout "$secs" sh -c "$cmd"
  else
    env -u GIT_INDEX_FILE -u GIT_DIR -u GIT_WORK_TREE -u GIT_PREFIX sh -c "$cmd"
  fi
  rc=$?
  if [ "$rc" -ne 0 ]; then
    [ "$rc" -eq 124 ] && echo "pi-gates: $label timed out after \${secs}s" >&2
    echo "pi-gates: $label FAILED (exit $rc). Fix the cause; do not bypass." >&2
    exit "$rc"
  fi
}

case "$hook" in
  pre-commit)
    run_gate "fast gate" "$(jq -r '.fast.command // empty' "$cfg")" "$(jq -r '.fast.timeoutSec // 300' "$cfg")" index
    ;;
  pre-push)
    run_gate "full gate" "$(jq -r '.full.command // empty' "$cfg")" "$(jq -r '.full.timeoutSec // 1800' "$cfg")" HEAD
    ;;
  commit-msg)
    msg=$1
    first=$(grep -v '^#' "$msg" | grep -m1 -v '^[[:space:]]*$')
    case "$first" in
      Merge\\ *|Revert\\ *|fixup!*|squash!*|amend!*) ;;
      *)
        if [ "$(jq -r '.commitMsg.conventional // false' "$cfg")" = true ]; then
          printf '%s\\n' "$first" | grep -Eq '^[a-z]+(\\([A-Za-z0-9._/-]+\\))?!?: .+' || {
            echo "pi-gates: commit subject is not a Conventional Commits header: $first" >&2
            echo "pi-gates: expected 'type(scope): summary', e.g. 'fix(auth): handle expired token'" >&2
            exit 1
          }
        fi
        ;;
    esac
    if [ "$(jq -r '.commitMsg.noAiAttribution // false' "$cfg")" = true ]; then
      if grep -Eiq 'co-authored-by:[[:space:]]*(claude|copilot|gemini|chatgpt|openai)|co-authored-by:[^<]*[[:space:]]ai([[:space:]]|<|$)|generated[[:space:]]+(with|by)[[:space:]]+(claude|copilot|gemini|chatgpt|cursor|codex|an? ai)|written[[:space:]]+(with|by)[[:space:]]+(claude|copilot|gemini|chatgpt|cursor|codex|an? ai)|ai[- ]generated|🤖' "$msg"; then
        echo "pi-gates: commit message contains an AI/agent attribution marker; remove it." >&2
        exit 1
      fi
    fi
    ;;
esac
exit 0
`;
}

export async function gatesConfigPath(exec: Exec, repoRoot: string): Promise<string> {
	const res = await exec("git", ["rev-parse", "--git-path", "pi-gates.json"], { cwd: repoRoot, timeout: 5000 });
	return resolve(repoRoot, res.stdout.trim() || ".git/pi-gates.json");
}

export function readGatesConfig(path: string): GatesConfig | undefined {
	try {
		return JSON.parse(readFileSync(path, "utf8")) as GatesConfig;
	} catch {
		return undefined;
	}
}

function isOurs(path: string): boolean {
	try {
		return readFileSync(path, "utf8").includes(MARKER);
	} catch {
		return false;
	}
}

export function hooksNeeded(config: GatesConfig): string[] {
	const needed: string[] = [];
	if (config.fast) needed.push("pre-commit");
	if (config.commitMsg.conventional || config.commitMsg.noAiAttribution) needed.push("commit-msg");
	if (config.full) needed.push("pre-push");
	return needed;
}

export interface InstallResult {
	hooks: string[];
	chained: string[];
	configPath: string;
}

export async function installGates(exec: Exec, report: HooksReport, config: GatesConfig): Promise<InstallResult> {
	const hooks = hooksNeeded(config);
	const chained: string[] = [];

	for (const name of GATE_HOOK_NAMES) {
		const target = join(report.hooksDir, name);
		if (!hooks.includes(name)) {
			if (isOurs(target)) rmSync(target);
			continue;
		}
		if (existsSync(target) && !isOurs(target)) {
			renameSync(target, `${target}.orig`);
			chained.push(name);
		}
		writeFileSync(target, renderDispatcher(), { mode: 0o755 });
		chmodSync(target, 0o755);
	}

	const configPath = await gatesConfigPath(exec, report.repoRoot);
	writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
	return { hooks, chained, configPath };
}

export interface UninstallResult {
	removed: string[];
	restored: string[];
	configRemoved: boolean;
}

export async function uninstallGates(exec: Exec, report: HooksReport): Promise<UninstallResult> {
	const removed: string[] = [];
	const restored: string[] = [];
	for (const name of GATE_HOOK_NAMES) {
		const target = join(report.hooksDir, name);
		if (!isOurs(target)) continue;
		rmSync(target);
		removed.push(name);
		if (existsSync(`${target}.orig`)) {
			renameSync(`${target}.orig`, target);
			restored.push(name);
		}
	}
	const configPath = await gatesConfigPath(exec, report.repoRoot);
	const configRemoved = existsSync(configPath);
	if (configRemoved) rmSync(configPath);
	return { removed, restored, configRemoved };
}
