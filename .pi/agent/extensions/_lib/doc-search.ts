/**
 * Search page for /doc: the library's index.html (spec unit 2, docs/specs/doc-system/handoff-slice-1.md).
 * One page, two states switched by the `docked` class on <body>:
 *   Landing --(query non-empty)--> Docked --(clear or Esc)--> Landing
 * Landing centres the search box and shows the legend in full; Docked pins the box at the top and
 * folds the legend into a <details> pill. The page reads the embedded index data only (the same cards
 * as index.json, whose contract is unchanged) and filters in the browser: no network, no LLM.
 */

const CSS = `
:root{--paper:#FBFAF8;--ink:#16191D;--slate:#5A6472;--accent:#1B5E6B;--soft:#E8F0F1;--card:#fff;--rule:rgba(22,25,29,.1)}
@media (prefers-color-scheme:dark){:root{--paper:#101316;--ink:#E6E8EA;--slate:#A2ACB9;--accent:#5FB3C2;--soft:#16282D;--card:#161A1E;--rule:rgba(230,232,234,.14)}}
body{font:15px/1.5 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif;margin:0;background:var(--paper);color:var(--ink)}
header{max-width:1100px;margin:0 auto;padding:0 1rem}
h1{font-family:Charter,Georgia,serif;font-weight:600;margin:0 0 .75rem}
input{width:100%;box-sizing:border-box;padding:.65rem .8rem;font:inherit;border:1px solid var(--rule);border-radius:8px;background:var(--card);color:var(--ink)}
.n{color:var(--slate);font-size:.85em;margin-top:.4rem}
#legend{color:var(--slate);font-size:.9em;margin-top:1rem}
#legend summary{cursor:pointer;list-style:none}
#legend .kinds{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.5rem}
#guidance{max-width:1100px;margin:1rem auto;padding:0 1rem;color:var(--slate)}
main{max-width:1100px;margin:0 auto 3rem;padding:0 1rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
a.c{display:block;background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:1rem 1.1rem;color:inherit;text-decoration:none}
a.c:hover{border-color:var(--accent)}
.c h2{font-family:Charter,Georgia,serif;font-size:1.1rem;margin:.35rem 0}
.c p{margin:.3rem 0 .6rem;color:var(--slate);font-size:.92em}
.m{font-size:.8em;color:var(--slate)} .k,.t{display:inline-block;border-radius:4px;padding:0 .4rem;font-size:.78em;margin:0 .2rem .2rem 0}
.k{background:var(--accent);color:var(--paper)} .t{background:var(--soft);color:var(--accent)}
/* Landing: box and legend centred in the viewport */
body:not(.docked) header{margin-top:18vh;text-align:center}
body:not(.docked) #legend summary{display:none}
/* Docked: box pinned at the top, legend folded into a pill */
body.docked header{position:sticky;top:0;z-index:1;background:var(--paper);padding-top:.75rem;padding-bottom:.75rem;border-bottom:1px solid var(--rule);max-width:none}
body.docked h1{display:none}
body.docked #legend{display:inline-block;margin-top:.4rem}
body.docked #legend summary{display:inline-block;border:1px solid var(--rule);border-radius:999px;padding:0 .7rem;font-size:.85em}
`;

/** Inline page script. Plain ES5-style JS in a string: it runs in the browser, not in this module. */
const SCRIPT = `
var docs=JSON.parse(document.getElementById('data').textContent);
var q=document.getElementById('q'),n=document.getElementById('n'),cards=document.getElementById('cards'),
 legend=document.getElementById('legend'),guidance=document.getElementById('guidance'),page=document.getElementById('page');
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var hay=docs.map(function(d){return [d.title,d.summary,d.kind,d.repo,d.date].concat(d.tags||[]).join(' ').toLowerCase()});
function card(d){return '<a class="c" href="'+esc(d.path)+'"><span class="k">'+esc(d.kind)+'</span>'+
 (d.tags||[]).map(function(t){return '<span class="t">'+esc(t)+'</span>'}).join('')+'<h2>'+esc(d.title)+'</h2><p>'+esc(d.summary)+
 '</p><div class="m">'+esc(d.date)+(d.repo?' \\u00b7 '+esc(d.repo):'')+'</div></a>'}
function draw(){
 var words=q.value.toLowerCase().split(/\\s+/).filter(Boolean);
 var shown=[];
 for(var i=0;i<docs.length;i++){var ok=true;for(var j=0;j<words.length;j++){if(hay[i].indexOf(words[j])<0){ok=false;break}}if(ok)shown.push(card(docs[i]))}
 var searching=words.length>0;
 page.classList.toggle('docked',searching);
 legend.open=!searching;
 guidance.hidden=docs.length>0;
 n.textContent=shown.length+' of '+docs.length+' documents';
 cards.innerHTML=shown.join('');
}
q.addEventListener('input',function(){history.replaceState(null,'','#'+encodeURIComponent(q.value));draw()});
q.addEventListener('keydown',function(e){if(e.key==='Escape'){q.value='';history.replaceState(null,'','#');draw()}});
addEventListener('keydown',function(e){if(e.key==='/'&&document.activeElement!==q){e.preventDefault();q.focus()}});
q.value=decodeURIComponent(location.hash.slice(1));draw();
`;

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/** Build index.html from the cards as JSON text (the index.json body) and the kinds the legend lists. */
export function renderSearchPage(cardsJson: string, kinds: readonly string[]): string {
	const data = cardsJson.replace(/<\//g, "<\\/");
	const legend = kinds.map((k) => `<span class="k">${escapeHtml(k)}</span>`).join("");
	return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Documents</title>
<style>${CSS}</style></head><body id="page">
<header><h1>Documents</h1>
<input id="q" placeholder="Search title, summary, tag, kind, repo  (press / to focus, Esc to clear)" autofocus>
<div class="n" id="n"></div>
<details id="legend" open><summary>Legend</summary><div class="kinds">${legend}</div></details></header>
<div id="guidance" hidden>No documents filed yet. Write one with <code>/doc</code>, or file an existing rendered page with <code>/doc file &lt;html&gt;</code>; it then appears here.</div>
<main id="cards"></main>
<script id="data" type="application/json">${data}</script>
<script>${SCRIPT}</script></body></html>
`;
}
