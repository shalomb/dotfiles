#!/usr/bin/env python3
"""Mock up an epic map from a local Jira cache (read only).

  epic_map_from_jira.py ~/.cache/jira/TAKOSDSO TAKOSDSO-229 out.html

Front page: the focus epic with what blocks it, what it unblocks and what relates
to it, from Jira issue links. One level down, each epic that is in the cache shows
the deliverables listed under "Scope" in its description. RAG is derived by the
rule printed at the foot of the page, not a team judgement.
"""
import json, pathlib, sys, datetime

BASE = "https://onetakeda.atlassian.net/browse/"
DONE = {"done", "closed", "delivered", "released"}
STARTED = {"implementing", "analyzing", "in progress", "in review"}
SKIP = {"discarded", "rejected", "won't do", "duplicate"}


def txt(n):
    return n["text"] if n.get("type") == "text" else "".join(txt(c) for c in n.get("content", []))


def sections(adf):
    """description ADF -> {'short': str, heading(lower): [text], 'produce': [], 'not': []}"""
    out, cur, mode = {"produce": [], "not": []}, "short", None
    for n in (adf or {}).get("content", []):
        t = n["type"]
        if t == "heading":
            cur, mode = txt(n).strip().lower(), None
        elif t == "paragraph":
            p = txt(n).strip()
            if cur == "scope" and p.lower().startswith("we will produce"):
                mode = "produce"
            elif cur == "scope" and p.lower().startswith("we will not"):
                mode = "not"
            elif p:
                out.setdefault(cur, []).append(p)
        elif t in ("orderedList", "bulletList") and cur == "scope" and mode:
            out[mode] += [txt(li).strip() for li in n["content"]]
    return out


def load_issues(path):
    """issues.jsonl -> {key: issue}; a bad line is reported with its number."""
    issues = {}
    try:
        lines = pathlib.Path(path).read_text().splitlines()
    except OSError as exc:
        sys.exit(f"error: cannot read {path}: {exc}")
    for number, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            issue = json.loads(line)
            issues[issue["key"]] = issue
        except (json.JSONDecodeError, KeyError) as exc:
            sys.exit(f"error: {path} line {number}: {exc!r}")
    return issues


def status_rag(role, status):
    s = (status or "").lower()
    if s in SKIP:
        return "X"
    if role == "blocker":
        return "G" if s in DONE else "A" if s in STARTED else "R"
    if role == "focus":
        return "G" if s in DONE else "A" if s in STARTED else "N"
    if role == "downstream":
        return "G" if s in DONE else "A"
    return "G" if s in DONE | STARTED else "N"


def person(f):
    return (f.get("assignee") or {}).get("displayName")


def main(cache, focus, out):
    cache = pathlib.Path(cache).expanduser()
    issues = load_issues(cache / "issues.jsonl")
    if focus not in issues:
        sys.exit(f"error: {focus} is not in {cache / 'issues.jsonl'}")
    asof = datetime.datetime.fromtimestamp((cache / "issues.jsonl").stat().st_mtime).strftime("%-d %b %Y")
    f0 = issues[focus]["fields"]

    # classify neighbours from Jira links
    roles = {}
    for link in f0["issuelinks"]:
        other = link.get("outwardIssue") or link.get("inwardIssue")
        k = other["key"]
        if link["type"]["name"] == "Blocks":
            role = "downstream" if link.get("outwardIssue") else "blocker"
        else:
            role = "related"
        prev = roles.get(k)
        if prev is None or role in ("blocker", "downstream"):
            roles[k] = (role, other["fields"], link["type"]["name"])

    def ref(k):
        return {"t": k, "href": BASE + k}

    def epic_node(k, role, fields, x, y):
        full = issues.get(k)
        sec = sections(full["fields"]["description"]) if full else {}
        ff = full["fields"] if full else fields
        status = ff["status"]["name"]
        owner = person(ff) if full else None
        plain = " ".join((sec.get("short") or ["Not in the local cache: only the summary and status come from the link."])[:1]
                         + (sec.get("outcome") or [])[:1])
        nxt = (sec.get("next step") or [""])[0]
        if nxt:
            plain += " Next step: " + nxt
        needs = (sec.get("decision needed") or [""])[0]
        sub = status + (f" · {owner.split()[0]}" if owner else "")
        node = {"id": k, "t": ff["summary"], "s": sub, "x": x, "y": y, "rag": status_rag(role, status),
                "h": f"{k} · {status}" + (f" · owner {owner}" if owner else ""), "plain": plain, "needs": needs, "refs": [ref(k)]}
        if full and (sec["produce"] or sec["not"]):
            node["drill"] = k
        return node

    col_x = [30, 300, 570, 840]
    nodes, edges = [], []
    cols = {"blocker": [], "downstream": [], "related": []}
    for k, (role, fields, _t) in roles.items():
        cols[role].append(k)
    for lst in cols.values():
        lst.sort(key=lambda k: (status_rag("related", roles[k][1]["status"]["name"]) == "X", k))

    def place(role, x, label):
        for i, k in enumerate(cols[role]):
            nodes.append(epic_node(k, role, roles[k][1], x, 44 + i * 104))
            if role == "blocker":
                st = roles[k][1]["status"]["name"].lower()
                edges.append([k, focus, label, 1 if status_rag("blocker", st) in ("R", "A") else 0])
            elif role == "downstream":
                edges.append([focus, k, label, 0])
            else:
                edges.append([focus, k, label, 2])

    rows = max(len(c) for c in cols.values())
    height = 44 + rows * 104 + 30
    blockers_open = [k for k in cols["blocker"] if status_rag("blocker", roles[k][1]["status"]["name"]) == "R"]
    place("blocker", col_x[0], "blocks")
    focus_node = epic_node(focus, "focus", f0, col_x[1], 44 + (rows * 104 - 104) // 2)
    own = status_rag("focus", f0["status"]["name"])
    focus_node["rag"] = "A" if blockers_open and own in ("A", "G") else own  # under way but blocked
    nodes.append(focus_node)
    place("downstream", col_x[2], "blocks")
    place("related", col_x[3], "relates")

    # one level down: scope of each epic that is in the cache
    sub = {}
    for n in nodes:
        k = n.get("drill")
        if not k:
            continue
        sec = sections(issues[k]["fields"]["description"])
        sn, rows_ = [], max(len(sec["produce"]), len(sec["not"]))
        for i, item in enumerate(sec["produce"]):
            sn.append({"id": f"{k}-p{i}", "t": item.rstrip("."), "s": "Not tracked in Jira", "x": 60, "y": 44 + i * 104,
                       "rag": "N", "h": "Deliverable (from the epic's Scope)", "plain": item, "needs": "", "refs": [ref(k)]})
        for i, item in enumerate(sec["not"]):
            sn.append({"id": f"{k}-n{i}", "t": item.rstrip("."), "s": "Out of scope", "x": 460, "y": 44 + i * 104,
                       "rag": "X", "h": "Explicitly out of scope", "plain": item, "needs": "", "refs": [ref(k)]})
        sub[k] = {"title": n["t"], "rag": n["rag"], "cols": ["We will produce", "We will not"],
                  "nodes": sn, "edges": [], "vw": 700, "vh": 44 + max(rows_, 1) * 104 + 30}

    nblk = len(blockers_open)
    status = f0["status"]["name"]
    short = (sections(f0["description"]).get("short") or [""])[0]
    data = {
        "meta": {
            "title": f"{f0['summary']}: {status.lower()}" + (f", but {nblk} blocker{'s' if nblk != 1 else ''} not started" if nblk else ""),
            "eyebrow": f"{focus} · {status} · epic map · Jira read {asof}",
            "lede": short + " This map comes straight from the Jira links of the epic: what blocks it, what it unblocks and what it relates to. Click any box for the plain-words story; open one to see the deliverables listed in its description.",
            "foot": "Source: local Jira cache, read-only. Colour is derived: a blocker is red until it starts, amber while under way, green when done; the focus epic is amber while under way; discarded is grey. Deliverables show 'Not tracked in Jira' because Jira holds no status for them. This is a mockup; it is not a team judgement and nothing was written to Jira.",
            "kpi": {"all": "epics in this view", "R": "blockers that have not started", "A": "under way or waiting on us", "G": "done or on track"},
        },
        "top": {"id": "epic", "title": f0["summary"], "rag": focus_node["rag"], "h": focus_node["h"],
                "plain": focus_node["plain"], "needs": focus_node["needs"], "refs": [ref(focus)],
                "cols": ["Blocked by", "This epic", "Unblocks", "Related"], "nodes": nodes, "edges": edges, "vw": 1100, "vh": height},
        "sub": sub,
    }
    tpl = (pathlib.Path(__file__).parent / "epic-map.template.html").read_text()
    html = tpl.replace("__DATA__", json.dumps(data).replace("</", "<\\/"))
    pathlib.Path(out).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(out).write_text(html)
    print(out, f"{len(html)//1024} KB", f"{len(nodes)} nodes", f"{len(sub)} drillable")


if __name__ == "__main__":
    main(*sys.argv[1:4])
