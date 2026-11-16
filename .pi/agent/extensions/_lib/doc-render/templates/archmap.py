"""Archmap template: a grid-placed list of nodes and edges becomes one inline-SVG architecture diagram.

Run through `template.py archmap in.json out.html`. Pure string building: no layout engine, no script, no
network. A node sits on a grid cell (col, row); an edge is routed with right angles only through the gaps between
columns, leaving and entering at the midpoint of a box side. Boundaries are the bounding box of their nodes.
The gate, tone rules and recipe come from kernel.py. Read-only: the diagram describes, it changes nothing.
"""
import html

from kernel import build_page, check_tone, fail, keep_known, need, opt_text, text_fields

TEMPLATE = "archmap.html"
GATE_DETAIL = "Read-only: this diagram describes a system and changes nothing. A human decides."
KINDS = ("security", "cloud", "backend", "database", "external")
KIND_NAMES = {"security": "Security", "cloud": "Cloud", "backend": "Backend", "database": "Database", "external": "External"}
STYLES = ("default", "emphasis", "security", "deploy")
NOTE_KINDS = KINDS + ("neutral",)
SCHEMA = {
    "title": None, "lede": None, "foot": None,
    "nodes": [{"id": None, "label": None, "sub": None, "kind": None, "col": None, "row": None, "span": None}],
    "boundaries": [{"id": None, "label": None, "nodes": None}],
    "edges": [{"from": None, "to": None, "label": None, "kind": None, "dashed": None}],
    "notes": [{"title": None, "kind": None, "items": None}],
}

MARGIN_X, MARGIN_Y = 40, 56
COLW, ROWH, NODE_W, NODE_H = 240, 120, 150, 64
PAD, TAG_H, PORT_STEP = 22, 16, 14
LABEL_CH, SUB_CH = 6.6, 5.5  # estimated monospace glyph widths for 11px bold and 9px text
PILL_CH, PILL_H = 5.4, 14

ICONS = {  # 12x12 line icons, drawn with the kind colour
    "security": "M6 1 L11 3 V6 C11 9 8.5 10.5 6 11.5 C3.5 10.5 1 9 1 6 V3 Z",
    "cloud": "M3.5 9.5 C1.8 9.5 1 8.4 1 7.2 C1 6 2 5.1 3.2 5.1 C3.5 3.4 4.8 2.5 6.3 2.5 C8 2.5 9.2 3.7 9.3 5.2 C10.5 5.3 11 6.2 11 7.3 C11 8.6 10 9.5 8.8 9.5 Z",
    "backend": "M4 3 L1 6 L4 9 M8 3 L11 6 L8 9",
    "database": "M2 3 C2 1.8 10 1.8 10 3 V9 C10 10.2 2 10.2 2 9 Z M2 3 C2 4.2 10 4.2 10 3 M2 6 C2 7.2 10 7.2 10 6",
    "external": "M1.5 2.5 H10.5 V9.5 H1.5 Z M1.5 5 H10.5",
}


def check_structure(doc):
    need(doc, "title", str, "")
    opt_text(doc, "lede", "")
    opt_text(doc, "foot", "")
    ids = set()
    nodes = need(doc, "nodes", list, "")
    if not nodes:
        fail("nodes", "must hold at least one node")
    for i, n in enumerate(nodes):
        f = f"nodes[{i}]"
        nid = need(n, "id", str, f)
        if nid in ids:
            fail(f"{f}.id", f"duplicate node id {nid!r}")
        ids.add(nid)
        need(n, "label", str, f)
        opt_text(n, "sub", f)
        if need(n, "kind", str, f) not in KINDS:
            fail(f"{f}.kind", f"must be one of {', '.join(KINDS)}, got {n['kind']!r}")
        for key in ("col", "row"):
            v = need(n, key, int, f)
            if isinstance(v, bool) or v < 0:
                fail(f"{f}.{key}", "must be a whole number, 0 or more")
        if "span" in n and (not isinstance(n["span"], int) or isinstance(n["span"], bool) or n["span"] < 1):
            fail(f"{f}.span", "must be a whole number, 1 or more")
    cells = {}
    for n in nodes:
        for c in range(n["col"], n["col"] + n.get("span", 1)):
            if (c, n["row"]) in cells:
                fail("nodes", f"{n['id']!r} and {cells[(c, n['row'])]!r} share the cell col {c}, row {n['row']}")
            cells[(c, n["row"])] = n["id"]
    for i, b in enumerate(doc.get("boundaries", [])):
        f = f"boundaries[{i}]"
        need(b, "id", str, f)
        need(b, "label", str, f)
        members = need(b, "nodes", list, f)
        if not members:
            fail(f"{f}.nodes", "must list at least one node id")
        for m in members:
            if m not in ids:
                fail(f"{f}.nodes", f"unknown node {m!r}")
    for i, e in enumerate(doc.get("edges", [])):
        f = f"edges[{i}]"
        for key in ("from", "to"):
            if need(e, key, str, f) not in ids:
                fail(f"{f}.{key}", f"unknown node {e[key]!r}; known nodes: {', '.join(sorted(ids))}")
        if e["from"] == e["to"]:
            fail(f, f"edge from {e['from']!r} to itself")
        opt_text(e, "label", f)
        if e.get("kind", "default") not in STYLES:
            fail(f"{f}.kind", f"must be one of {', '.join(STYLES)}, got {e['kind']!r}")
        if "dashed" in e and not isinstance(e["dashed"], bool):
            fail(f"{f}.dashed", "must be true or false")
    for i, n in enumerate(doc.get("notes", [])):
        f = f"notes[{i}]"
        need(n, "title", str, f)
        if n.get("kind", "neutral") not in NOTE_KINDS:
            fail(f"{f}.kind", f"must be one of {', '.join(NOTE_KINDS)}, got {n['kind']!r}")
        items = need(n, "items", list, f)
        for j, item in enumerate(items):
            if not isinstance(item, str):
                fail(f"{f}.items[{j}]", "must be text")


# ---- layout ----

def box(n):
    span = n.get("span", 1)
    x = MARGIN_X + n["col"] * COLW
    return {"x": x, "y": MARGIN_Y + n["row"] * ROWH, "w": NODE_W + (span - 1) * COLW, "h": NODE_H}


def gap_centres(nodes):
    last = max(n["col"] + n.get("span", 1) for n in nodes)
    return [MARGIN_X + k * COLW - (COLW - NODE_W) / 2 for k in range(1, last)]


def sides(a, b):
    """(side leaving a, side entering b) by grid position: same row is horizontal, same column vertical."""
    if a["row"] == b["row"]:
        return ("R", "L") if b["col"] > a["col"] else ("L", "R")
    if a["col"] == b["col"]:
        return ("B", "T") if b["row"] > a["row"] else ("T", "B")
    return (("R", "L") if b["col"] > a["col"] else ("L", "R"))


def ports(nodes, edges):
    """Where each edge touches each box: edges sharing one side are spread along it so they do not overlap."""
    by_id = {n["id"]: n for n in nodes}
    use = {}
    for i, e in enumerate(edges):
        a, b = by_id[e["from"]], by_id[e["to"]]
        sa, sb = sides(a, b)
        use.setdefault((a["id"], sa), []).append((i, "from", b))
        use.setdefault((b["id"], sb), []).append((i, "to", a))
    out = {}
    for (nid, side), items in use.items():
        bx = box(by_id[nid])
        horiz = side in "LR"
        items.sort(key=lambda it: (it[2]["row"], it[2]["col"]) if horiz else (it[2]["col"], it[2]["row"]))
        for k, (i, end, _) in enumerate(items):
            off = (k - (len(items) - 1) / 2) * PORT_STEP
            if side == "R":
                pt = (bx["x"] + bx["w"], bx["y"] + NODE_H / 2 + off)
            elif side == "L":
                pt = (bx["x"], bx["y"] + NODE_H / 2 + off)
            elif side == "B":
                pt = (bx["x"] + bx["w"] / 2 + off, bx["y"] + NODE_H)
            else:
                pt = (bx["x"] + bx["w"] / 2 + off, bx["y"])
            out[(i, end)] = (pt, side)
    return out


def num(v):
    return f"{v:g}"


def route(p, q, side_p, gaps, rows_y):
    """Points of an orthogonal route from p to q: straight, or H-V-H / V-H-V through a gap between columns/rows."""
    (x1, y1), (x2, y2) = p, q
    if y1 == y2 or x1 == x2:
        return [p, q]
    if side_p in "LR":
        mid = min(gaps, key=lambda g: abs(g - (x1 + x2) / 2)) if gaps else (x1 + x2) / 2
        if (x1 < mid < x2) or (x2 < mid < x1):
            return [p, (mid, y1), (mid, y2), q]
        return [p, ((x1 + x2) / 2, y1), ((x1 + x2) / 2, y2), q]
    mid = min(rows_y, key=lambda g: abs(g - (y1 + y2) / 2)) if rows_y else (y1 + y2) / 2
    if (y1 < mid < y2) or (y2 < mid < y1):
        return [p, (x1, mid), (x2, mid), q]
    return [p, (x1, (y1 + y2) / 2), (x2, (y1 + y2) / 2), q]


def path_d(points):
    """M/H/V commands only: each leg is horizontal or vertical."""
    d = [f"M{num(points[0][0])} {num(points[0][1])}"]
    for (ax, ay), (bx, by) in zip(points, points[1:]):
        if ay == by:
            d.append(f"H{num(bx)}")
        else:
            d.append(f"V{num(by)}")
    return " ".join(d)


def label_spot(points, text):
    """The midpoint of the longest leg, and the pill size for the text."""
    legs = list(zip(points, points[1:]))
    (ax, ay), (bx, by) = max(legs, key=lambda s: abs(s[1][0] - s[0][0]) + abs(s[1][1] - s[0][1]))
    w = len(text) * PILL_CH + 12
    return (ax + bx) / 2, (ay + by) / 2, w


# ---- drawing ----

def esc(text):
    return html.escape(text, quote=True)


def fit(text, per_char, avail):
    """A textLength attribute only when the estimated text would overflow its box."""
    if len(text) * per_char > avail:
        return f' textLength="{num(avail)}" lengthAdjust="spacingAndGlyphs"'
    return ""


def draw_node(n):
    b = box(n)
    x, y, w, h = b["x"], b["y"], b["w"], b["h"]
    cx = x + w / 2
    title = f'{n["label"]}: {n["sub"]}' if n.get("sub") else n["label"]
    parts = [f'<g class="node k-{n["kind"]}" data-node-id="{esc(n["id"])}" tabindex="0"><title>{esc(title)} ({KIND_NAMES[n["kind"]].lower()})</title>',
             f'<rect class="box" x="{num(x)}" y="{num(y)}" width="{num(w)}" height="{h}" rx="10"/>',
             f'<path class="icon" transform="translate({num(x + 8)} {num(y + 7)})" d="{ICONS[n["kind"]]}"/>']
    ly = y + (32 if n.get("sub") else 40)
    parts.append(f'<text class="lbl" x="{num(cx)}" y="{num(ly)}" text-anchor="middle"{fit(n["label"], LABEL_CH, w - 24)}>{esc(n["label"])}</text>')
    if n.get("sub"):
        parts.append(f'<text class="sub" x="{num(cx)}" y="{num(y + 49)}" text-anchor="middle"{fit(n["sub"], SUB_CH, w - 20)}>{esc(n["sub"])}</text>')
    return "".join(parts) + "</g>"


def draw_boundary(b, by_id):
    boxes = [box(by_id[m]) for m in b["nodes"]]
    x0 = min(r["x"] for r in boxes) - PAD
    y0 = min(r["y"] for r in boxes) - PAD - 6
    x1 = max(r["x"] + r["w"] for r in boxes) + PAD
    y1 = max(r["y"] + r["h"] for r in boxes) + PAD
    tw = len(b["label"]) * PILL_CH + 14
    return (f'<g class="bnd" data-boundary-id="{esc(b["id"])}"><rect class="boundary" x="{num(x0)}" y="{num(y0)}" '
            f'width="{num(x1 - x0)}" height="{num(y1 - y0)}" rx="14"/>'
            f'<rect class="tag" x="{num(x0 + 12)}" y="{num(y0 - TAG_H / 2)}" width="{num(tw)}" height="{TAG_H}" rx="5"/>'
            f'<text class="tagt" x="{num(x0 + 19)}" y="{num(y0 + 3)}">{esc(b["label"])}</text></g>'), (x0, y0, x1, y1)


def draw_edges(doc):
    nodes, edges = doc["nodes"], doc["edges"]
    by_id = {n["id"]: n for n in nodes}
    pts = ports(nodes, edges)
    gaps = gap_centres(nodes)
    rows_y = [MARGIN_Y + r * ROWH - (ROWH - NODE_H) / 2 for r in range(1, max(n["row"] for n in nodes) + 1)]
    paths, pills = [], []
    for i, e in enumerate(edges):
        style = e.get("kind", "default")
        (p, sp), (q, _) = pts[(i, "from")], pts[(i, "to")]
        points = route(p, q, sp, gaps, rows_y)
        cls = f"edge s-{style}" + (" dash" if e.get("dashed") else "")
        a, b = by_id[e["from"]]["label"], by_id[e["to"]]["label"]
        paths.append(f'<path class="{cls}" data-from="{esc(e["from"])}" data-to="{esc(e["to"])}" d="{path_d(points)}" '
                     f'marker-end="url(#ah-{style})"><title>{esc(a)} to {esc(b)}{": " + esc(e["label"]) if e.get("label") else ""}</title></path>')
        if e.get("label"):
            mx, my, w = label_spot(points, e["label"])
            pills.append(f'<g class="pill s-{style}"><rect x="{num(mx - w / 2)}" y="{num(my - PILL_H / 2)}" width="{num(w)}" '
                         f'height="{PILL_H}" rx="7"/><text x="{num(mx)}" y="{num(my + 3)}" text-anchor="middle">{esc(e["label"])}</text></g>')
    return "".join(paths), "".join(pills)


def marker(style):
    return (f'<marker id="ah-{style}" class="mk s-{style}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" '
            f'orient="auto-start-reverse"><path d="M0 1 L10 5 L0 9 Z"/></marker>')


def diagram(doc):
    nodes = doc["nodes"]
    by_id = {n["id"]: n for n in nodes}
    bounds, rects = [], []
    for b in doc.get("boundaries", []):
        svg, rect = draw_boundary(b, by_id)
        bounds.append(svg)
        rects.append(rect)
    edge_svg, pill_svg = draw_edges(doc)
    boxes = [box(n) for n in nodes]
    width = max([r["x"] + r["w"] for r in boxes] + [r[2] for r in rects]) + MARGIN_X
    height = max([r["y"] + r["h"] for r in boxes] + [r[3] for r in rects]) + MARGIN_X
    title = esc(doc["title"])
    return (f'<svg class="archmap" role="img" aria-labelledby="am-title" viewBox="0 0 {num(width)} {num(height)}" xmlns="http://www.w3.org/2000/svg">'
            f'<title id="am-title">{title}</title><defs>{"".join(marker(s) for s in STYLES)}</defs>'
            f'{"".join(bounds)}{edge_svg}{"".join(draw_node(n) for n in nodes)}{pill_svg}</svg>')


def legend(nodes):
    count = {k: sum(n["kind"] == k for n in nodes) for k in KINDS}
    items = "".join(f'<span class="lg lg-{k}"><i></i>{KIND_NAMES[k]} <b>{count[k]}</b></span>' for k in KINDS if count[k])
    return f'<div class="legend"><span class="lgh">Legend</span>{items}</div>'


def notes_html(notes):
    cards = []
    for n in notes:
        items = "".join(f"<li>{esc(t)}</li>" for t in n["items"])
        cards.append(f'<div class="note"><h3><i class="nd nd-{n.get("kind", "neutral")}"></i>{esc(n["title"])}</h3><ul>{items}</ul></div>')
    return f'<div class="notes">{"".join(cards)}</div>' if cards else ""


def body(doc):
    lede = f'<p class="lede">{esc(doc["lede"])}</p>' if doc.get("lede") else ""
    foot = f'<p class="foot">{esc(doc["foot"])}</p>' if doc.get("foot") else ""
    return (f'<h1>{esc(doc["title"])}</h1>{lede}<div class="stage">{diagram(doc)}{legend(doc["nodes"])}</div>'
            f'{notes_html(doc.get("notes", []))}{foot}')


def derive(doc):
    return {"nodes": len(doc["nodes"]), "edges": len(doc.get("edges", [])), "boundaries": len(doc.get("boundaries", []))}


def build(doc):
    doc = keep_known(doc, SCHEMA)
    check_structure(doc)
    skip = {"id", "kind", "col", "row", "span", "from", "to", "dashed", "nodes"}
    texts = list(text_fields({k: v for k, v in doc.items() if k != "boundaries"}, "", skip))
    texts += [(f"boundaries[{i}].label", b["label"]) for i, b in enumerate(doc.get("boundaries", []))]
    check_tone({"meta": {"title": doc["title"]}}, texts)
    data = {"meta": {"title": doc["title"], "lede": doc.get("lede", "")}, "glossary": {}, "derived": derive(doc)}
    page = build_page(__file__, TEMPLATE, doc, data, GATE_DETAIL)
    return page.replace("<!--ARCHMAP:BODY-->", body(doc))
