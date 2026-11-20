const NS="http://www.w3.org/2000/svg";
function el(tag,attrs,kids,ns){const e=ns?document.createElementNS(NS,tag):document.createElement(tag);
  for(const k in (attrs||{})){if(k==="text"){if(ns)e.textContent=attrs[k];else cite(e,attrs[k]);}else if(k==="plain")e.textContent=attrs[k];else e.setAttribute(k,attrs[k]);}
  (kids||[]).forEach(c=>e.appendChild(c));return e;}
const $=id=>document.getElementById(id);
function clear(e){while(e.firstChild)e.removeChild(e.firstChild);}
const REFN={};DATA.refs.forEach(r=>{REFN[r.id]=r.n;});
function cite(e,text){if(typeof text!=="string")text=text==null?"":String(text);
  text.split(/(?<!\\)\[(r\d+)\]/).forEach((part,i)=>{
  if(i%2===0){part=part.replace(/\\\[(r\d+)\]/g,"[$1]");if(part)e.appendChild(document.createTextNode(part));return;}
  if(REFN[part]===undefined){e.appendChild(document.createTextNode("["+part+"]"));return;}
  const a=document.createElement("a");a.setAttribute("href","#ref-"+REFN[part]);a.setAttribute("class","cite");a.setAttribute("data-n",String(REFN[part]));a.textContent="["+REFN[part]+"]";e.appendChild(a);});}
function backTo(n){const c=document.querySelector('a.cite[data-n="'+n+'"]');if(c)c.scrollIntoView({behavior:"smooth",block:"center"});}
function basisTag(b){return el("em",{class:"basis b-"+b,text:b});}
function renderGlossary(root,heading){const terms=Object.keys(DATA.glossary);
  if(!terms.length)return;root.appendChild(heading);
  const dl=el("dl",{class:"gloss"});terms.forEach(t=>dl.appendChild(el("div",{},[el("dt",{text:t}),el("dd",{text:DATA.glossary[t]})])));root.appendChild(dl);}
function renderRefs(box){if(!DATA.refs.length)return;box.appendChild(el("h2",{text:"References"}));
  const ol=el("ol",{class:"refs"});
  DATA.refs.forEach(r=>{const li=el("li",{id:"ref-"+r.n},[el("a",{href:r.href,plain:r.title}),el("span",{class:"kind",text:r.kind})]);
    if(r.cited){const back=el("a",{href:"#",text:" ↩"});back.addEventListener("click",ev=>{ev.preventDefault();backTo(r.n);});li.appendChild(back);}
    else li.appendChild(el("span",{class:"kind",text:"also relevant"}));
    ol.appendChild(li);});
  box.appendChild(ol);}
function renderMade(){const RECIPE=JSON.parse($("recipe").textContent),made=$("madebody");
  [["Template",RECIPE.template],["Renderer",RECIPE.renderer_file+" (sha256 "+RECIPE.renderer_sha256.slice(0,12)+")"],["Rebuild",RECIPE.rebuild]]
    .forEach(x=>made.appendChild(el("div",{},[el("b",{text:x[0]+": "}),el("code",{text:x[1]})])));
  made.appendChild(el("div",{text:RECIPE.note+" The input is embedded in this page as JSON."}));
  const d=$("made");let was=false;
  addEventListener("beforeprint",()=>{if(d){was=d.open;d.open=true;}});addEventListener("afterprint",()=>{if(d)d.open=was;});}
