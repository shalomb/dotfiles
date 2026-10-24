#!/usr/bin/env python3
"""Re-apply lazy-loading of defuddle/wreq-js/linkedom to pi-smart-fetch (idempotent)."""
import pathlib, shutil, sys
p = pathlib.Path.home()/".pi/agent/npm/node_modules/pi-smart-fetch/dist/index.js"
s = p.read_text()
old = "import { Defuddle } from 'defuddle/node';\nimport { getProfiles, fetch } from 'wreq-js';\nimport { parseHTML } from 'linkedom';\n"
new = """let __lazy;
function __loadLazy() {
  return __lazy ??= Promise.all([import('defuddle/node'), import('wreq-js'), import('linkedom')]).then(([d, w, l]) => ({ Defuddle: d.Defuddle, getProfiles: w.getProfiles, fetch: w.fetch, parseHTML: l.parseHTML }));
}
let parseHTML = () => { throw new Error("linkedom not loaded"); };
const fetch = async (...a) => { const m = await __loadLazy(); parseHTML = m.parseHTML; return m.fetch(...a); };
const Defuddle = async (...a) => { const m = await __loadLazy(); return m.Defuddle(...a); };
const getProfiles = async () => (await __loadLazy()).getProfiles();
"""
if "__loadLazy" in s: print("already patched"); sys.exit(0)
if old not in s: sys.exit("pattern not found; upstream changed")
shutil.copy(p, str(p)+".orig"); p.write_text(s.replace(old, new, 1)); print("patched")
