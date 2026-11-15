"""Epic map template: a local Jira cache plus an epic key become one self-contained HTML page.

Run through `template.py epicmap in.json out.html`. Input and rules: docs/specs/doc-system/epicmap.md.
Front page: the focus epic with what blocks it, what it unblocks and what relates to it, from Jira issue
links. One level down, each cached neighbour shows the deliverables listed under "Scope" in its
description. RAG and the KPI counts are derived by the rule printed at the foot of the page. This module
owns the input check, the layout (node boxes, edge label positions, wrapped titles) and the per-view
KPIs; the gate, references, claim labels and recipe come from kernel.py. Read-only: nothing is fetched.
"""
import datetime
import json
import pathlib

from kernel import build_page, fail, need

TEMPLATE = "epicmap.html"
NEEDS_BASE = True  # template.py passes the input file's folder, so a relative cache resolves from there
GATE_DETAIL = "Read-only view of Jira: nothing here is written back. A human decides."
JIRA_BASE = "https://onetakeda.atlassian.net/browse/"
DONE = {"done", "closed", "delivered", "released"}
STARTED = {"implementing", "analyzing", "in progress", "in review"}
SKIP = {"discarded", "rejected", "won't do", "duplicate"}

NODE_W, NODE_H, ROW_PITCH, COL_X, VIEW_W = 190, 96, 104, [30, 300, 570, 840], 1100
TITLE_CHARS, TITLE_LINES = 24, 3
LABEL_CH, LABEL_H = 6.2, 14  # estimated label box: 6.2px per character wide, 14px high
RAG_NAMES = {"G": "GREEN", "A": "AMBER", "R": "RED", "N": "NOT STARTED", "X": "DISCARDED"}
NOT_TRACKED = "Not tracked in Jira"
KPI_LABELS = {"all": "epics in this view", "R": "blockers that have not started",
              "A": "under way or waiting on us", "G": "done or on track"}
LEDE = ("This map comes straight from the Jira links of the epic: what blocks it, what it unblocks and what it "
        "relates to. Click any box for the plain-words story; open one to see the deliverables listed in its description.")
FOOT = ("Source: local Jira cache, read-only. Colour is derived: a blocker is red until it starts, amber while under way, "
        "green when done; the focus epic is amber while under way; discarded is grey. The counts above are derived from "
        "that colour. Status and owner are measured: they are copied from Jira. Deliverables show 'Not tracked in Jira' "
        "because Jira holds no status for them. This is not a team judgement and nothing was written to Jira.")
TRACKED_NOTE = "None of these deliverables has a Jira ticket, so Jira shows no status for them."


# ---- input ----

def read_input(doc, base):
    """Validate the input and return (epic, issues.jsonl path, cache folder name)."""
    cache = need(doc, "cache", str, "")
    epic = need(doc, "epic", str, "")
    path = pathlib.Path(cache).expanduser()
    if not path.is_absolute():
        path = (pathlib.Path(base) if base else pathlib.Path.cwd()) / path
    path = path.resolve()
    jsonl = path if path.is_file() else path / "issues.jsonl"
    return epic, jsonl, jsonl.parent.name


def load_issues(path):
    """issues.jsonl -> ({key: issue}, issues read); a bad line is reported with its number."""
    issues, parsed = {}, 0
    try:
        lines = path.read_text().splitlines()
    except OSError as exc:
        fail("cache", f"cannot read {path}: {exc}")
    for number, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            issue = json.loads(line)
            if not isinstance(issue, dict) or not isinstance(issue.get("key"), str) or not isinstance(issue.get("fields"), dict):
                raise ValueError("expected an object with 'key' and 'fields'")
            issues[issue["key"]] = issue
            parsed += 1
        except ValueError as exc:  # JSONDecodeError is a ValueError
            fail("cache", f"{path.name} line {number}: {exc}")
    return issues, parsed


# ---- reading Jira ----

def txt(n):
    return n["text"] if n.get("type") == "text" else "".join(txt(c) for c in n.get("content", []))


def sections(adf):
    """description ADF -> {'short': [str], heading(lower): [text], 'produce': [], 'not': []}"""
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


# ---- layout ----

def wrap(text, width=TITLE_CHARS, max_lines=TITLE_LINES):
    """Wrap to at most `max_lines`; only text beyond that is cut, and the cut line ends with an ellipsis."""
    out, cur = [], ""
    for word in str(text).split():
        if cur and len(f"{cur} {word}") > width:
            out.append(cur)
            cur = word
        else:
            cur = f"{cur} {word}".strip()
    if cur:
        out.append(cur)
    if len(out) > max_lines:
        out = out[:max_lines]
        out[-1] = out[-1][:width - 1].rstrip() + "…"
    return out or [""]


def anchor(a, b):
    """Point on a's box edge toward b."""
    ax, ay, bx, by = a["x"] + NODE_W / 2, a["y"] + NODE_H / 2, b["x"] + NODE_W / 2, b["y"] + NODE_H / 2
    dx, dy = bx - ax, by - ay
    s = min((NODE_W / 2 + 4) / abs(dx or 1e-9), (NODE_H / 2 + 4) / abs(dy or 1e-9))
    return round(ax + dx * s, 1), round(ay + dy * s, 1)


def label_box(lx, ly, label):
    w = LABEL_CH * len(label)
    return (lx - w / 2, ly - LABEL_H, lx + w / 2, ly)  # the text sits on baseline `ly`, centred on `lx`


def hit(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def place_labels(edges, nodes, vw, vh):
    """Set lx, ly on every edge: start at the edge midpoint, slide along the edge and nudge up or down until
    the label box meets no other label box and, where possible, no node box. Boxes stay inside the viewBox."""
    along = sorted((i / 20 for i in range(1, 20)), key=lambda t: abs(t - 0.5))
    nudges = [0, -15, 15, -30, 30, -45, 45, -60, 60]
    node_boxes = [(n["x"], n["y"], n["x"] + NODE_W, n["y"] + NODE_H) for n in nodes]
    placed = []
    for e in edges:
        found = fallback = None
        for t in along:
            for dy in nudges:
                lx = round(e["x1"] + (e["x2"] - e["x1"]) * t, 1)
                ly = round(e["y1"] + (e["y2"] - e["y1"]) * t - 5 + dy, 1)
                box = label_box(lx, ly, e["label"])
                if box[0] < 0 or box[2] > vw or box[1] < 0 or box[3] > vh or any(hit(box, p) for p in placed):
                    continue
                if not any(hit(box, nb) for nb in node_boxes):
                    found = (lx, ly)
                    break
                fallback = fallback or (lx, ly)
            if found:
                break
        e["lx"], e["ly"] = found or fallback or (e["x1"], e["y1"])
        placed.append(label_box(e["lx"], e["ly"], e["label"]))


# ---- derived numbers ----

def kpi_top(nodes):
    """Tiles for the front page, counted from the nodes shown there."""
    counts = {k: sum(n["rag"] == k for n in nodes) for k in "RAG"}
    values = {"all": sum(n["rag"] != "X" for n in nodes), **counts}
    return [{"id": k, "label": KPI_LABELS[k], "value": values[k], "filter": k, "note": ""} for k in ("all", "R", "A", "G")]


def kpi_sub(nodes):
    """Tiles for one drill view, counted from the nodes shown in it. 'Tracked in Jira' says why when it is 0."""
    tracked = sum(n["s"] != NOT_TRACKED and n["rag"] != "X" for n in nodes)
    return [{"id": "produce", "label": "deliverables", "value": sum(n["rag"] == "N" for n in nodes), "filter": "N", "note": ""},
            {"id": "out", "label": "out of scope", "value": sum(n["rag"] == "X" for n in nodes), "filter": "X", "note": ""},
            {"id": "tracked", "label": "tracked in Jira", "value": tracked, "filter": None,
             "note": "" if tracked else TRACKED_NOTE}]


# ---- the map ----

def derive(issues, focus):
    f0 = issues[focus]["fields"]
    refs, cited = [], []

    def ref_id(k):
        found = next((r for r in refs if r["href"].endswith("/" + k)), None)
        if found is None:
            summary = (issues[k]["fields"] if k in issues else linked[k][1])["summary"]
            found = {"id": f"r{len(refs) + 1}", "title": f"{k}: {summary}", "href": JIRA_BASE + k, "kind": "ticket"}
            refs.append(found)
        return found["id"]

    # classify neighbours from Jira links
    roles, linked = {}, {}
    for lk in f0.get("issuelinks") or []:
        other = lk.get("outwardIssue") or lk.get("inwardIssue")
        k = other["key"]
        if lk["type"]["name"] == "Blocks":
            role = "downstream" if lk.get("outwardIssue") else "blocker"
        else:
            role = "related"
        if k not in roles or role in ("blocker", "downstream"):
            roles[k] = role
            linked[k] = (role, other["fields"])
    linked[focus] = ("focus", f0)

    def epic_node(k, role, fields, x, y):
        full = issues.get(k)
        sec = sections(full["fields"].get("description")) if full else {}
        ff = full["fields"] if full else fields
        status = ff["status"]["name"]
        owner = person(ff) if full else None
        plain = " ".join((sec.get("short") or ["Not in the local cache: only the summary and status come from the link."])[:1]
                         + (sec.get("outcome") or [])[:1])
        nxt = (sec.get("next step") or [""])[0]
        if nxt:
            plain += " Next step: " + nxt
        rid = ref_id(k)
        plain += f" [{rid}]"
        cited.append(plain)
        node = {"id": k, "full": ff["summary"], "lines": wrap(ff["summary"]),
                "s": status + (f" · {owner.split()[0]}" if owner else ""), "x": x, "y": y,
                "rag": status_rag(role, status), "h": f"{k} · {status}" + (f" · owner {owner}" if owner else ""),
                "plain": plain, "needs": (sec.get("decision needed") or [""])[0], "ref": rid,
                "basis": {"rag": "derived", "status": "measured"}}
        node["ragname"] = RAG_NAMES[node["rag"]]
        if full and (sec["produce"] or sec["not"]):
            node["drill"] = k
        return node

    cols = {"blocker": [], "downstream": [], "related": []}
    for k, role in roles.items():
        cols[role].append(k)
    for lst in cols.values():
        lst.sort(key=lambda k: (status_rag("related", linked[k][1]["status"]["name"]) == "X", k))
    rows = max(len(c) for c in cols.values())
    height = 44 + rows * ROW_PITCH + 30
    blockers_open = [k for k in cols["blocker"] if status_rag("blocker", linked[k][1]["status"]["name"]) == "R"]
    nodes, pairs = [], []

    def place(role, x, label):
        for i, k in enumerate(cols[role]):
            nodes.append(epic_node(k, role, linked[k][1], x, 44 + i * ROW_PITCH))
            if role == "blocker":
                st = linked[k][1]["status"]["name"].lower()
                pairs.append((k, focus, label, 1 if status_rag("blocker", st) in ("R", "A") else 0))
            elif role == "downstream":
                pairs.append((focus, k, label, 0))
            else:
                pairs.append((focus, k, label, 2))

    place("blocker", COL_X[0], "blocks")
    focus_node = epic_node(focus, "focus", f0, COL_X[1], 44 + (rows * ROW_PITCH - ROW_PITCH) // 2)
    own = status_rag("focus", f0["status"]["name"])
    focus_node["rag"] = "A" if blockers_open and own in ("A", "G") else own  # under way but blocked
    focus_node["ragname"] = RAG_NAMES[focus_node["rag"]]
    nodes.append(focus_node)
    place("downstream", COL_X[2], "blocks")
    place("related", COL_X[3], "relates")

    by_id = {n["id"]: n for n in nodes}
    edges = []
    for a, b, label, kind in pairs:
        (x1, y1), (x2, y2) = anchor(by_id[a], by_id[b]), anchor(by_id[b], by_id[a])
        edges.append({"a": a, "b": b, "label": label, "kind": kind, "x1": x1, "y1": y1, "x2": x2, "y2": y2})
    place_labels(edges, nodes, VIEW_W, height)

    # one level down: scope of each epic that is in the cache
    sub, kpi_by_view = {}, {}
    for n in nodes:
        k = n.get("drill")
        if not k:
            continue
        sec = sections(issues[k]["fields"].get("description"))
        sn, sub_rows = [], max(len(sec["produce"]), len(sec["not"]))
        rid = ref_id(k)

        def deliverable(item, idx, x, rag, status, note):
            text = f"{item} [{rid}]"
            cited.append(text)
            return {"id": f"{k}-{idx}", "full": item.rstrip("."), "lines": wrap(item.rstrip(".")), "s": status, "x": x,
                    "y": 44 + int(idx[1:]) * ROW_PITCH, "rag": rag, "ragname": "OUT OF SCOPE" if rag == "X" else RAG_NAMES[rag],
                    "h": note, "plain": text, "needs": "", "ref": rid, "basis": {"rag": "derived", "status": "derived"}}

        for i, item in enumerate(sec["produce"]):
            sn.append(deliverable(item, f"p{i}", 60, "N", NOT_TRACKED, "Deliverable (from the epic's Scope)"))
        for i, item in enumerate(sec["not"]):
            sn.append(deliverable(item, f"n{i}", 460, "X", "Out of scope", "Explicitly out of scope"))
        sub[k] = {"title": n["full"], "rag": n["rag"], "ragname": n["ragname"], "cols": ["We will produce", "We will not"],
                  "nodes": sn, "edges": [], "vw": 700, "vh": 44 + max(sub_rows, 1) * ROW_PITCH + 30,
                  "nw": NODE_W, "nh": NODE_H}
        kpi_by_view[k] = kpi_sub(sn)

    nblk = len(blockers_open)
    status = f0["status"]["name"]
    return {
        "meta": {
            "title": f"{f0['summary']}: {status.lower()}" + (f", but {nblk} blocker{'s' if nblk != 1 else ''} not started" if nblk else ""),
            "lede": ((sections(f0.get("description")).get("short") or [""])[0] + " " + LEDE).strip(),
            "foot": FOOT, "kpi": KPI_LABELS,
        },
        "top": {"focus": focus, "title": f0["summary"], "rag": focus_node["rag"], "ragname": focus_node["ragname"],
                "cols": ["Blocked by", "This epic", "Unblocks", "Related"], "nodes": nodes, "edges": edges,
                "vw": VIEW_W, "vh": height, "nw": NODE_W, "nh": NODE_H},
        "sub": sub,
        "derived": {"kpi": {"top": kpi_top(nodes), "sub": kpi_by_view}},
    }, refs, cited


def build(doc, base=None):
    epic, jsonl, cache_name = read_input(doc, base)
    issues, count = load_issues(jsonl)
    if epic not in issues:
        fail("epic", f"{epic} is not in {jsonl}")
    data, refs, cited = derive(issues, epic)
    read_at = datetime.datetime.fromtimestamp(jsonl.stat().st_mtime).strftime("%Y-%m-%d")
    data["meta"]["eyebrow"] = f"{epic} · {issues[epic]['fields']['status']['name']} · epic map · Jira read {read_at}"
    # the kernel numbers references by first citation, so hand it the cited texts in page order
    kernel_doc = {"refs": refs, "cited": cited}
    recipe_input = {"epic": epic, "cache": cache_name, "issues": count, "read_at": read_at}
    return build_page(__file__, TEMPLATE, kernel_doc, data, GATE_DETAIL, recipe_input)
