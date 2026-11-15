"""Story-doc page: masthead (kind, status, meta, title, ask, quote, KPIs, spine),
contents, sections with anchors, widgets, inline Mermaid and Sources.

The page frame and CSS come from docs/prototypes/lead-doc-template.html.
"""
import datetime
import hashlib
import html
import json
import os
import pathlib
import re
import shutil
import subprocess
import tempfile

import widgets

HERE = pathlib.Path(__file__).resolve().parent
ASSETS = HERE / "assets"

STATUS_TONES = {"proposed": "accent", "in review": "accent", "recommended": "accent",
                "approved": "ok", "decided": "ok", "final": "ok", "done": "ok", "tested": "ok",
                "draft": "warn", "not yet": "warn", "untested": "warn", "assumption": "warn", "at risk": "warn",
                "rejected": "risk", "blocked": "risk", "failed": "risk"}


def status_tone(text):
    """The tone of the first status phrase found; negations ('not yet tested') win over their verb."""
    t = text.lower()
    hits = [(t.find(k), -len(k), tone) for k, tone in STATUS_TONES.items() if re.search(rf"\b{re.escape(k)}\b", t)]
    return min(hits)[2] if hits else ""

MERMAID_CONFIG = {
    "theme": "base",
    "fontFamily": "ui-sans-serif, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    "htmlLabels": False,
    "flowchart": {"htmlLabels": False, "curve": "basis"},
    "themeVariables": {
        "fontFamily": "ui-sans-serif, Segoe UI, Roboto, Helvetica, Arial, sans-serif", "fontSize": "14px",
        "primaryColor": "#FFFFFF", "primaryBorderColor": "#5B6475", "primaryTextColor": "#16191D",
        "lineColor": "#6B7584", "secondaryColor": "#E6EFF1", "tertiaryColor": "#F3F4F6",
        "edgeLabelBackground": "#FFFFFF", "clusterBkg": "#F7F8FA", "clusterBorder": "#E3E6EB",
        "textColor": "#16191D", "noteBkgColor": "#F3F4F6", "noteTextColor": "#16191D",
    },
}

THEME_JS = ('try{const k="lead-doc-theme",v=localStorage.getItem(k),r=v&&document.getElementById("theme-"+v);'
            'if(r)r.checked=true;document.addEventListener("change",e=>{if(e.target.name==="theme")'
            'localStorage.setItem(k,e.target.value)})}catch(e){}')


PRESENT_JS = r"""(function(){
var root=document.documentElement, big=matchMedia("(min-width:760px)"), btn=document.querySelector(".present-toggle"),
    cnt=document.querySelector(".present-count");
function slides(){return [].slice.call(document.querySelectorAll(".masthead, main > section"));}
function current(){var s=slides(),y=scrollY+innerHeight/3,b=0;s.forEach(function(e,i){if(e.offsetTop<=y)b=i;});return b;}
function show(){if(cnt){cnt.textContent=(current()+1)+" / "+slides().length;}}
function go(i){var s=slides();i=Math.max(0,Math.min(s.length-1,i));s[i].scrollIntoView({behavior:"smooth"});}
function set(on){on=on&&big.matches;root.classList.toggle("present",on);if(btn){btn.setAttribute("aria-pressed",on);
  btn.textContent=on?"Read":"Present";}if(on){document.querySelectorAll("details.fold[open]").forEach(function(d){d.open=false;});show();}
  try{history.replaceState(null,"",on?"#present":location.pathname+location.search);}catch(e){}}
if(btn)btn.addEventListener("click",function(){set(!root.classList.contains("present"));});
addEventListener("scroll",function(){if(root.classList.contains("present"))show();},{passive:true});
addEventListener("keydown",function(e){if(e.target.closest&&e.target.closest("input,textarea,summary,[contenteditable]"))return;
  var on=root.classList.contains("present");
  if(e.key==="p"||e.key==="P"){if(!e.metaKey&&!e.ctrlKey){e.preventDefault();set(!on);}return;}
  if(!on)return;
  if(e.key==="Escape"){set(false);}
  else if(["ArrowRight","ArrowDown","PageDown"," "].indexOf(e.key)>=0){e.preventDefault();go(current()+1);}
  else if(["ArrowLeft","ArrowUp","PageUp"].indexOf(e.key)>=0){e.preventDefault();go(current()-1);}
  else if(e.key==="Home"){e.preventDefault();go(0);}
  else if(e.key==="End"){e.preventDefault();go(slides().length-1);}});
big.addEventListener("change",function(){if(!big.matches)set(false);});
addEventListener("beforeprint",function(){set(false);});
if(location.hash==="#present"||root.dataset.start==="present")set(true);
})();"""


def css(brand_css=None):
    parts = [(ASSETS / n).read_text(encoding="utf-8") for n in ("tokens.css", "page.css", "widgets.css", "present.css")]
    if brand_css:
        parts.append("/* brand */\n" + pathlib.Path(brand_css).read_text(encoding="utf-8"))
    return "\n".join(parts)


# ---------- mermaid ----------

def _cache_dir():
    base = os.environ.get("DOC_RENDER_CACHE") or os.path.join(
        os.environ.get("XDG_CACHE_HOME") or os.path.expanduser("~/.cache"), "agent-skills", "doc-render")
    return pathlib.Path(base)


def render_mermaid(src):
    """Mermaid source → themed inline SVG (cached by content), or None when mmdc is missing or fails."""
    mmdc = shutil.which("mmdc")
    if not mmdc:
        return None
    key = hashlib.sha256((json.dumps(MERMAID_CONFIG, sort_keys=True) + src).encode()).hexdigest()[:16]
    cache = _cache_dir() / f"{key}.svg"
    if cache.is_file():
        return cache.read_text(encoding="utf-8")
    with tempfile.TemporaryDirectory() as tmp:
        t = pathlib.Path(tmp)
        (t / "in.mmd").write_text(src, encoding="utf-8")
        (t / "cfg.json").write_text(json.dumps(MERMAID_CONFIG), encoding="utf-8")
        r = subprocess.run([mmdc, "-i", str(t / "in.mmd"), "-o", str(t / "out.svg"), "-b", "transparent",
                            "-c", str(t / "cfg.json"), "-I", f"m{key}", "-q"],
                           capture_output=True, text=True, timeout=60)
        if r.returncode or not (t / "out.svg").is_file():
            return None
        svg = (t / "out.svg").read_text(encoding="utf-8")
    svg = re.sub(r"<\?xml[^>]*>\s*", "", svg)
    svg = re.sub(r'\s(width="100%"|style="max-width:[^"]*")', "", svg)
    svg = widgets.tokenise_svg(svg)
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(svg, encoding="utf-8")
    return svg


# ---------- masthead ----------

def take_meta(body):
    """First paragraph of `**Label:** value` pairs → list of (label, value html)."""
    m = re.search(r"<p>(<strong>[^<]{2,48}:</strong>.*?)</p>", body, flags=re.S)
    if not m or body[:m.start()].strip():
        return body, []
    parts = re.split(r"<strong>([^<:]{2,48}):</strong>", m.group(1))
    fields = []
    for i in range(1, len(parts) - 1, 2):
        val = re.sub(r"\s+", " ", parts[i + 1])
        val = re.sub(r"^(\s|<br\s*/?>)+|(\s|<br\s*/?>|·)+$", "", val).strip()
        fields.append((parts[i].strip(), val))
    return body[m.end():], fields


def take_ask(body):
    m = re.match(r"\s*<p><strong>(?:The ask in one sentence|In one sentence|The goal in one sentence|The decision):</strong>\s*(.*?)</p>",
                 body, flags=re.S)
    return (body[m.end():], m.group(1).strip()) if m else (body, "")


def take_preamble(body):
    """Everything before the first <h2> that is a quote or a story widget goes in the masthead."""
    cut = re.search(r"<h2\b", body)
    head, rest = (body[:cut.start()], body[cut.start():]) if cut else (body, "")
    keep, lift = [], []
    for block in re.findall(r"<blockquote>.*?</blockquote>|<dl class=\"kpis\">.*?</dl>|<ol class=\"spine\".*?</ol>|"
                            r"<(?:p|div|ul|ol|aside|figure|details|table|pre)\b.*?</(?:p|div|ul|ol|aside|figure|details|table|pre)>",
                            head, flags=re.S):
        (lift if re.match(r'<blockquote>|<dl class="kpis">|<ol class="spine"', block) else keep).append(block)
    return "\n".join(keep) + rest, "\n".join(lift)


def eyebrow(kind, fields):
    bits = [f'<span class="kind">{html.escape(kind)}</span>'] if kind else []
    for label, val in fields:
        if label.lower() == "status":
            for s in re.split(r"\s*[·,;]\s*", re.sub(r"<[^>]+>", "", val)):
                if s:
                    tone = status_tone(s)
                    bits.append(f'<span class="pill {tone}">{html.escape(s)}</span>'.replace('class="pill "', 'class="pill"'))
        else:
            bits.append(f'<span class="meta-f"><b>{html.escape(label)}</b> {val}</span>')
    bits.append('<span class="theme" role="radiogroup" aria-label="Colour theme">'
                '<input type="radio" name="theme" id="theme-light" value="light"><label for="theme-light">Light</label>'
                '<input type="radio" name="theme" id="theme-auto" value="auto" checked><label for="theme-auto">Auto</label>'
                '<input type="radio" name="theme" id="theme-dark" value="dark"><label for="theme-dark">Dark</label></span>')
    return f'<p class="eyebrow">{"".join(bits)}</p>'


# ---------- body ----------

def headings(body):
    """`<h2 id><span num>…` reshaping: keep a number chip, plain text title."""
    def repl(m):
        hid, text = m.group(1), m.group(2)
        flat = re.sub(r"\s+", " ", re.sub("<[^>]+>", "", text)).strip()
        num = re.match(r"^(\d+)\.\s*(.*)$", flat)
        if num:
            return f'<h2 id="{hid}"><span class="num">{num.group(1)}</span>{html.escape(html.unescape(num.group(2)))}</h2>'
        return f'<h2 id="{hid}">{html.escape(html.unescape(flat))}</h2>'
    return re.sub(r'<h2\s+id="([^"]+)"[^>]*>(.*?)</h2>', repl, body, flags=re.S)


def toc(body):
    items = []
    for hid, inner in re.findall(r'<h2\s+id="([^"]+)"[^>]*>(.*?)</h2>', body, flags=re.S):
        label = re.sub(r'<span class="num">\d+</span>|<a class="anchor".*?</a>|<[^>]+>', "", inner).strip()
        items.append(f'<li><a href="#{hid}">{label}</a></li>')
    return "\n    ".join(items)


def wrap_tables(body):
    return re.sub(r"(?<!<div class=\"tw\">)<table>", '<div class="tw"><table>', body).replace(
        "</table>", "</table></div>").replace("</table></div></div>", "</table></div>")


def render(body_html, title, kind, source_label, brand_css=None, mermaid=render_mermaid, start_present=False):
    """pandoc HTML (title still inside) → full story page."""
    m = re.search(r"<h1[^>]*>(.*?)</h1>", body_html, flags=re.S)
    if m:
        title = title or html.unescape(re.sub(r"\s+", " ", re.sub("<[^>]+>", "", m.group(1))).strip())
        body_html = body_html[:m.start()] + body_html[m.end():]
    title = title or "Untitled"
    body, fields = take_meta(widgets.dedupe_footnotes(body_html))
    body, ask = take_ask(body)
    body = widgets.apply_all(body, mermaid)
    body, lifted = take_preamble(body)
    body = wrap_tables(re.sub(r"<hr\s*/?>", "", body))
    body = widgets.sections(headings(body))
    desc = html.escape(re.sub(r"<[^>]+>", "", ask))
    built = datetime.date.today()
    lede = f'<p class="lede">{ask}</p>' if ask else ""
    return f"""<!doctype html>
<html lang="en"{' data-start="present"' if start_present else ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{html.escape(title)}</title>
{f'<meta name="description" content="{desc}">' if desc else ''}
<style>
{css(brand_css)}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="page">
<header class="masthead">
  {eyebrow(kind, fields)}
  <h1>{html.escape(title)}</h1>
  {lede}
  {lifted}
</header>
<div class="body">
<nav class="toc" aria-label="Contents">
  <h2>Contents</h2>
  <ol>
    {toc(body)}
  </ol>
</nav>
<main id="main">
{body}
</main>
</div>
<footer class="colophon">
  {f'<span>Source: <code>{html.escape(source_label)}</code></span>' if source_label else ''}
  <span>Generated <time datetime="{built.isoformat()}">{built.strftime('%-d %b %Y')}</time></span>
  <span>Previous versions in <code>versions/</code></span>
</footer>
</div>
<button type="button" class="present-toggle" aria-pressed="false" aria-keyshortcuts="P" title="Present (P). Arrows move, Esc leaves.">Present</button>
<div class="present-count" aria-live="polite"></div>
<script>{THEME_JS}</script>
<script>{PRESENT_JS}</script>
</body>
</html>
"""
