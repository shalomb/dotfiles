#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# ///
"""Analyze how often agents type guarded commands (grep/find/sed, pip/poetry/venv) in pi sessions.

Usage: pi-find --everywhere --all --no-pick --json --since 365d > sessions.json
       scripts/analyze-guard-hits.py sessions.json [SINCE_ISO_DATE]
Counts bash tool calls whose shell segments start with a guarded command, whether it was a pipe
filter (`cmd | grep`) or a leading command, and whether the guard blocked it (toolResult 'NOT RUN').
"""
import json, re, sys, collections, pathlib

GUARDED = {"grep": "rg", "egrep": "rg", "fgrep": "rg", "find": "fd", "sed": "sd/read",
           "pip": "uv", "pip3": "uv", "pipx": "uvx", "poetry": "uv", "virtualenv": "uv venv"}
SEG = re.compile(r"(\||&&|\|\||;|\n)")
PY_M = re.compile(r"(?:^|\s)python[\d.]*\s[^|;&\n]*-m\s*(pip|venv|py_compile)\b")
QUOTED = re.compile(r"""'[^']*'|"[^"]*"|<<-?\s*'?(\w+)'?.*?\n\1\n""", re.S)

def hits(cmd: str):
    flat = QUOTED.sub("''", cmd)
    parts = SEG.split(flat)
    out, piped = [], False
    for p in parts:
        if SEG.fullmatch(p or "x"):
            piped = p == "|"
            continue
        w = p.strip().split()
        while w and (re.match(r"^\w+=", w[0]) or w[0] in {"sudo", "env", "time", "!", "{", "(", "do", "then"}):
            w = w[1:]
        if w:
            name = w[0].rsplit("/", 1)[-1]
            if name in GUARDED:
                out.append((name, "pipe" if piped else "lead"))
    for m in PY_M.finditer(flat):
        out.append((f"python -m {m.group(1)}", "lead"))
    return out

def main(path, since=""):
    try:
        with open(path) as fh:
            loaded = json.load(fh)
    except (OSError, json.JSONDecodeError) as err:
        sys.exit(f"cannot read session list {path}: {err}")
    sessions = [s for s in loaded if s.get("started", "") >= since]
    by_tool = collections.Counter(); by_pos = collections.Counter(); by_month = collections.defaultdict(collections.Counter)
    blocked = collections.Counter(); bash_calls = 0; sess_hit = set(); retry_cost = 0
    for s in sessions:
        f = pathlib.Path(s.get("file") or "/nonexistent")
        if not f.is_file():
            continue
        pending = {}
        for line in f.open(errors="replace"):
            try:
                e = json.loads(line)
            except Exception:
                continue
            m = e.get("message") or {}
            c = m.get("content")
            if m.get("role") == "assistant" and isinstance(c, list):
                for b in c:
                    if b.get("type") == "toolCall" and b.get("name") == "bash":
                        bash_calls += 1
                        h = hits((b.get("arguments") or {}).get("command", ""))
                        if h:
                            pending[b["id"]] = h
                            sess_hit.add(s["id"])
                            mon = s["started"][:7]
                            for name, pos in h:
                                by_tool[name] += 1; by_pos[(name, pos)] += 1; by_month[mon][name] += 1
            elif m.get("role") == "toolResult" and m.get("toolCallId") in pending:
                txt = "".join(x.get("text", "") for x in c if isinstance(x, dict)) if isinstance(c, list) else str(c)
                if "NOT RUN" in txt or "disallowed" in txt:
                    for name, _ in pending[m["toolCallId"]]:
                        blocked[name] += 1
                    retry_cost += 1
    print(f"sessions={len(sessions)} bash_calls={bash_calls} sessions_with_hits={len(sess_hit)}")
    print(f"guard-blocked calls (each costs >=1 wasted round trip): {retry_cost}\n")
    print(f"{'command':<22}{'total':>7}{'pipe':>7}{'lead':>7}{'blocked':>9}")
    for name, n in by_tool.most_common():
        print(f"{name:<22}{n:>7}{by_pos[(name,'pipe')]:>7}{by_pos[(name,'lead')]:>7}{blocked[name]:>9}")
    print("\nby month (session start):")
    for mon in sorted(by_month):
        print(" ", mon, dict(by_month[mon].most_common()))

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "sessions.json", sys.argv[2] if len(sys.argv) > 2 else "")
