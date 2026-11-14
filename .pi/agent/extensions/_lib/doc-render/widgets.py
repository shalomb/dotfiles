"""Story widgets: reshape pandoc's HTML for fenced divs into the story-doc markup.

Authors write Markdown inside `::: name` fenced divs, so links, emphasis and
footnote citations keep working; these functions only rearrange the HTML that
pandoc produced. Each one is idempotent on HTML that has no such widget.

  ::: kpis       - **97%** label — delta [ask]
  ::: spine      - **Today** ... / **So** ... / **Instead** ... / **We ask** ...
  ::: compare    ### Today ... ### With the model ...   (last part is "after")
  ::: fold       **Summary** small text \\n\\n content   (::: engineers = "For engineers")
  ::: decision   ### Question \\n - **Id:** / **Recommend:** / **Owner:** / **Decide by:** / **Blocks:**
  ::: bars       - label: 63%   (**bold** = happy path; "kill: 75%" draws the line)
  ::: glossary   - **Term:** definition        {{Term}} or {{Term|text}} links to it
  [proposed] [tested: 32] [assumption] [blocked] ...  status pills
  [RISK — ...] [CHECK — ...]                          callouts (standalone) or pills (inline)
  ```mermaid                                          inline SVG figure; **Notice:** next line = caption
"""
import html
import re

FLAG_WORDS = "GAP|CHECK|TODO|NOTE|RISK|OPEN"


# ---------- helpers ----------

def _each_div(body, cls, fn):
    """Replace every fenced div of class `cls` (balanced) with fn(inner).

    Pandoc emits `<div class="cls">`, or `<section id=… class="cls">` when the
    div starts with a heading; both are matched.
    """
    opener = re.compile(rf'<(div|section)\b[^>]*\bclass="{re.escape(cls)}"[^>]*>')
    out, pos = [], 0
    while True:
        m = opener.search(body, pos)
        if not m:
            out.append(body[pos:])
            return "".join(out)
        tag = m.group(1)
        close = f"</{tag}>"
        depth, i = 1, m.end()
        while depth:
            nxt = re.search(rf"<{tag}\b|</{tag}>", body[i:])
            if not nxt:
                out.append(body[pos:])
                return "".join(out)
            depth += -1 if nxt.group(0) == close else 1
            i += nxt.end()
        out.append(body[pos:m.start()])
        out.append(fn(body[m.end():i - len(close)].strip()))
        pos = i


def _items(inner):
    return [li.strip() for li in re.findall(r"<li>(.*?)</li>", inner, flags=re.S)]


def _text(fragment):
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _outside_code(body, fn):
    """Apply fn to text outside <pre>…</pre> and <code>…</code>, and outside tags."""
    parts = re.split(r"(<pre\b.*?</pre>|<code\b.*?</code>|<[^>]+>)", body, flags=re.S)
    return "".join(p if i % 2 else fn(p) for i, p in enumerate(parts))


DASH = re.compile(r"\s+(?:—|–|--)\s+")


# ---------- widgets ----------

def kpis(body):
    def tile(li):
        ask = bool(re.search(r"\s*\[ask\]\s*$", li))
        li = re.sub(r"\s*\[ask\]\s*$", "", li)
        m = re.match(r"<strong>(.*?)</strong>\s*(.*)$", li, flags=re.S)
        if not m:
            return f"<div><dt>{li}</dt></div>"
        value, rest = m.groups()
        label, delta = (DASH.split(rest, maxsplit=1) + [""])[:2]
        cls = ' class="ask"' if ask else ""
        d = f'<dd class="delta">{delta}</dd>' if delta else ""
        return f"<div{cls}><dt>{label}</dt><dd>{value}</dd>{d}</div>"
    return _each_div(body, "kpis", lambda inner: f'<dl class="kpis">{"".join(tile(li) for li in _items(inner))}</dl>')


def spine(body):
    def item(li):
        return re.sub(r"^<strong>(.*?)</strong>\s*", r"<b>\1</b>", li, flags=re.S)
    return _each_div(body, "spine", lambda inner:
                     f'<ol class="spine" aria-label="The story in four lines">{"".join(f"<li>{item(li)}</li>" for li in _items(inner))}</ol>')


def compare(body):
    def build(inner):
        parts = [p for p in re.split(r"(?=<h3\b)", inner) if p.strip()]
        lead = [p for p in parts if not p.lstrip().startswith("<h3")]
        cols = [p for p in parts if p.lstrip().startswith("<h3")]
        divs = [f'<div{" class=\"after\"" if i == len(cols) - 1 and len(cols) > 1 else ""}>{c.strip()}</div>'
                for i, c in enumerate(cols)]
        return "".join(lead) + f'<div class="compare">{"".join(divs)}</div>'
    return _each_div(body, "compare", build)


def folds(body):
    def build(inner, default=None):
        m = re.match(r"<p><strong>(.*?)</strong>\s*(.*?)</p>\s*", inner, flags=re.S)
        if m:
            title, small = m.group(1), m.group(2).strip()
            inner = inner[m.end():]
            if default:
                title = f"{default}: {title}"
        else:
            title, small = default or "Details", ""
        s = f" <small>{small}</small>" if small else ""
        return f'<details class="fold"><summary>{title}{s}</summary><div>{inner}</div></details>'
    body = _each_div(body, "fold", build)
    return _each_div(body, "engineers", lambda inner: build(inner, "For engineers"))


DECISION_KEYS = {"id": "id", "recommend": "Recommend", "recommendation": "Recommend", "owner": "Owner",
                 "decide by": "Decide by", "by": "Decide by", "blocks": "blocks", "options": "Options"}


def decisions(body):
    def card(inner):
        h = re.search(r"<h3[^>]*>(.*?)</h3>", inner, flags=re.S)
        question = h.group(1) if h else ""
        fields = {}
        for li in _items(inner):
            m = re.match(r"<strong>([^<]+?):</strong>\s*(.*)$", li, flags=re.S)
            if m and m.group(1).strip().lower() in DECISION_KEYS:
                fields[DECISION_KEYS[m.group(1).strip().lower()]] = m.group(2).strip()
        did, blocks = fields.pop("id", ""), fields.pop("blocks", "")
        hid = slug(did) if did else slug(_text(question))[:40]
        pill = f'<span class="pill accent">blocks {blocks}</span>' if blocks else ""
        rows = "".join(f'<dt>{k}</dt><dd{" class=\"rec\"" if k == "Recommend" else ""}>{v}</dd>' for k, v in fields.items())
        cls = "decision primary" if blocks else "decision"
        return (f'<article class="{cls}" aria-labelledby="{hid}"><header><span>{did}</span>{pill}</header>'
                f'<h3 id="{hid}">{question}</h3><dl>{rows}</dl></article>')
    body = _each_div(body, "decision", card)
    return re.sub(r'((?:<article class="decision[^"]*".*?</article>\s*)+)',
                  lambda m: f'<div class="decisions">{m.group(1).strip()}</div>\n', body, flags=re.S)


def bars(body):
    def build(inner):
        rows, kill = [], None
        for li in _items(inner):
            hp = li.startswith("<strong>")
            text = _text(li)
            m = re.match(r"^(.*?):\s*([\d.]+)\s*%$", text)
            if not m:
                continue
            label, value = m.group(1).strip(), m.group(2)
            if label.lower() in ("kill", "kill line"):
                kill = value
                continue
            rows.append((label, value, hp))
        k = f'<span class="kill" style="left:{kill}%"></span>' if kill else ""
        bars_html = "".join(
            f'<div class="bar{" hp" if hp else ""}"><span>{html.escape(label)}</span><span class="track">'
            f'<span class="fill" style="width:{v}%"></span>{k}</span><output>{v}%</output></div>'
            for label, v, hp in rows)
        notes = " ".join(_text(p) for p in re.findall(r"<p>(.*?)</p>", inner, flags=re.S))
        legend = " ".join(x for x in [f"kill line {kill}%." if kill else "", html.escape(notes)] if x)
        cap = f'<figcaption class="legend">{"<i></i>" if kill else ""}{legend}</figcaption>' if legend else ""
        return f'<figure class="bars">{bars_html}{cap}</figure>'
    return _each_div(body, "bars", build)


def glossary(body):
    def build(inner):
        rows = []
        for li in _items(inner):
            m = re.match(r"<strong>([^<]+?):</strong>\s*(.*)$", li, flags=re.S)
            if m:
                term = m.group(1).strip()
                rows.append(f'<dt id="g-{slug(term)}">{term}</dt><dd>{m.group(2).strip()}</dd>')
        return f'<dl class="glossary">{"".join(rows)}</dl>'
    body = _each_div(body, "glossary", build)

    def link(m):
        term, shown = m.group(1).strip(), (m.group(2) or m.group(1)).strip()
        return f'<a class="term" href="#g-{slug(html.unescape(term))}">{shown}</a>'
    return _outside_code(body, lambda t: re.sub(r"\{\{([^}|]+)(?:\|([^}]+))?\}\}", link, t))


PILL_TONES = {
    "ok": ("approved", "decided", "done", "passed", "tested", "shipped", "live"),
    "warn": ("assumption", "draft", "at risk", "untested", "estimate", "unvalidated"),
    "risk": ("blocked", "failed", "rejected", "overdue"),
    "accent": ("proposed", "now", "recommended", "next"),
    "": ("observed", "as observed", "status", "confidence", "as of", "snapshot"),
}
_TONE = {w: tone for tone, words in PILL_TONES.items() for w in words}
PILL = re.compile(r"\[(" + "|".join(sorted(map(re.escape, _TONE), key=len, reverse=True)) + r")(?::\s*([^\]<]+))?\](?!\()", re.I)


def pills(body):
    def repl(m):
        key, extra = m.group(1).lower(), m.group(2)
        tone = _TONE[key]
        text = f"{m.group(1)}: {extra.strip()}" if extra else m.group(1)
        if key in ("status",) and extra:
            tone = _TONE.get(extra.strip().lower(), "")
            text = extra.strip()
        cls = f"pill {tone}".strip()
        return f'<span class="{cls}">{text}</span>'
    return _outside_code(body, lambda t: PILL.sub(repl, t))


def callouts(body):
    def tag(word):
        return word.capitalize()
    body = re.sub(
        rf"<p>(?:<strong>)?\[({FLAG_WORDS})\b\s*(?:—|–|-|:)?\s*([^\]]*)\](?:</strong>)?</p>",
        lambda m: (f'<aside class="callout{" risk" if m.group(1) == "RISK" else ""}" aria-label="{tag(m.group(1))}">'
                   f"<b>{tag(m.group(1))}</b>{m.group(2).strip()}</aside>"),
        body)
    return re.sub(
        rf"\[({FLAG_WORDS})\b\s*(?:—|–|-|:)?\s*([^\]]*)\]",
        lambda m: (f'<span class="pill {"risk" if m.group(1) == "RISK" else "warn"}">{tag(m.group(1))}</span> '
                   f"{m.group(2).strip()}"),
        body)


def dedupe_footnotes(body):
    """pandoc gives every citation its own note; merge notes with the same text and renumber."""
    notes = re.search(r'(<section id="footnotes"[^>]*>\s*(?:<hr\s*/?>)?\s*<ol>)(.*?)(</ol>\s*</section>)', body, flags=re.S)
    if not notes:
        return body
    items = re.findall(r'<li id="fn(\d+)">(.*?)</li>', notes.group(2), flags=re.S)
    canon, new_num, kept = {}, {}, []
    for n, content in items:
        text = re.sub(r'<a href="#fnref\d+"[^>]*>.*?</a>', "", content, flags=re.S).strip()
        if text not in canon:
            canon[text] = len(kept) + 1
            kept.append(text)
        new_num[n] = canon[text]
    def ref(m):
        k = new_num.get(m.group(1), m.group(1))
        return f'<a href="#fn{k}" class="footnote-ref" role="doc-noteref"><sup>{k}</sup></a>'
    head = re.sub(r'<a href="#fn(\d+)" class="footnote-ref" id="fnref\d+" role="doc-noteref"><sup>\d+</sup></a>',
                  ref, body[:notes.start()])
    lis = "".join(f'<li id="fn{i}">{t}</li>\n' for i, t in enumerate(kept, 1))
    return head + notes.group(1) + "\n" + lis + notes.group(3) + body[notes.end():]


def sections(body):
    """Wrap each h2 and what follows in a <section>, add hover anchors, put footnotes under Sources."""
    notes = re.search(r'<section id="footnotes"[^>]*>\s*(?:<hr\s*/?>)?\s*(<ol>.*?</ol>)\s*</section>', body, flags=re.S)
    if notes:
        body = body[:notes.start()] + body[notes.end():]
    pieces = re.split(r'(<h2\s+id="[^"]+"[^>]*>.*?</h2>)', body, flags=re.S)
    out = [pieces[0]]
    placed = False
    for i in range(1, len(pieces), 2):
        head, content = pieces[i], pieces[i + 1] if i + 1 < len(pieces) else ""
        hid_m = re.search(r'id="([^"]+)"', head)
        hid = hid_m.group(1) if hid_m else f"s{i}"
        head = head.replace("</h2>", f' <a class="anchor" href="#{hid}" aria-label="Link to this section">#</a></h2>', 1)
        if notes and hid in ("sources", "references", "notes") and not placed:
            content = content.rstrip() + f'\n<div class="footnotes">{notes.group(1)}</div>\n'
            placed = True
        out.append(f'<section aria-labelledby="{hid}">\n{head}{content.rstrip()}\n</section>\n')
    if notes and not placed:
        out.append(f'<section aria-labelledby="sources">\n<h2 id="sources" class="h2-plain"><span class="htext">Sources</span>'
                   f' <a class="anchor" href="#sources" aria-label="Link to this section">#</a></h2>\n'
                   f'<div class="footnotes">{notes.group(1)}</div>\n</section>\n')
    return "".join(out)


# ---------- mermaid ----------

SVG_TOKENS = {
    "#ffffff": "var(--card)", "#fff": "var(--card)",
    "#16191d": "var(--ink)", "#5b6475": "var(--mute)", "#6b7584": "var(--mute)",
    "#e6eff1": "var(--accent-soft)", "#1b5e6b": "var(--accent)",
    "#f3f4f6": "var(--surface)", "#f7f8fa": "var(--surface)", "#e3e6eb": "var(--rule)",
}


def tokenise_svg(svg):
    """Swap the palette colours mermaid was given for the page's CSS tokens (dark mode, brands)."""
    return re.sub(r"#[0-9a-fA-F]{6}\b|#[fF]{3}\b",
                  lambda m: SVG_TOKENS.get(m.group(0).lower(), m.group(0)), svg)


def mermaid(body, render):
    """`<pre class="mermaid">` → inline SVG figure; a following **Notice:** paragraph is the caption."""
    def repl(m):
        src = html.unescape(m.group(1))
        svg = render(src)
        if not svg:
            return m.group(0)
        cap = m.group(2)
        figcap = f"<figcaption>{cap.replace('<strong>', '<b>', 1).replace('</strong>', '</b>', 1)}</figcaption>" if cap else ""
        return f'<figure><div class="diagram mermaid">{svg}</div>{figcap}</figure>'
    return re.sub(r'<pre class="mermaid"><code>(.*?)</code></pre>(?:\s*<p>(<strong>Notice:</strong>.*?)</p>)?',
                  repl, body, flags=re.S)


def apply_all(body, render_mermaid=lambda src: None):
    """All widgets, in an order where none sees another's output as input."""
    for fn in (kpis, spine, compare, folds, decisions, bars, glossary):
        body = fn(body)
    body = mermaid(body, render_mermaid)
    body = callouts(body)
    return pills(body)
