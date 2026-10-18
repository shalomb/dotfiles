/** Shell-like argument splitting for slash-command args: whitespace separates, '…' and "…" group, \ escapes. */
export function splitArgs(input: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  let started = false;
  const s = input.trim();
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === "\\" && quote === '"' && i + 1 < s.length) cur += s[++i];
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (ch === "\\" && i + 1 < s.length) {
      cur += s[++i];
      started = true;
    } else if (/\s/.test(ch)) {
      if (started || cur) { out.push(cur); cur = ""; started = false; }
    } else {
      cur += ch;
    }
  }
  if (started || cur) out.push(cur);
  return out;
}
