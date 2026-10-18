/**
 * Shell command segmentation (shared helper — NOT an extension).
 *
 * The guards inspect the commands an agent is about to run. Splitting a script
 * with a regex on `|`/`;`/`&&` goes wrong in both directions:
 *   - it splits INSIDE quotes, so `rg 'a|grep' f` looks like it runs `grep`
 *     (false block) and `rg 'a|b' /usr/lib` hides the path (missed block)
 *   - it ignores newlines, so `echo hi\ngrep x` hides the second command
 *
 * This splits a script into simple-command segments the way the shell would
 * for these purposes: on unquoted newline, `;`, `|`, `||`, `|&`, `&&`, `&`
 * (but not `>&`/`&>`), parentheses and backticks. It also
 *   - recurses into `$(...)` / backticks that sit inside double quotes
 *   - skips heredoc bodies (they are data, not commands)
 *   - records, per segment, whether it is piped into / out of, or backgrounded
 *   - (segmentsDeep) follows `sh -c '...'` / `bash -lc "..."` bodies
 *
 * Not a full shell parser: no aliases, functions, variable expansion, `eval`
 * or here-docs with expanding `$(...)` bodies. It targets ordinary agent
 * commands, not a determined bypass.
 */

import { basename } from "node:path";

export interface Segment {
	text: string;
	/** Preceded by `|` / `|&`: stdin is a pipe, not a terminal. */
	pipedIn: boolean;
	/** Followed by `|` / `|&`. */
	pipedOut: boolean;
	/** Ended by a single unquoted `&`: runs in the background. */
	background: boolean;
}

interface RawSegment {
	text: string;
	endedBy: string;
}

interface Heredoc {
	delim: string;
	dash: boolean;
}

function readBalanced(s: string, openIdx: number): { text: string; end: number } {
	let depth = 0;
	for (let j = openIdx; j < s.length; j++) {
		if (s[j] === "(") {
			depth += 1;
		} else if (s[j] === ")") {
			depth -= 1;
			if (depth === 0) return { text: s.slice(openIdx + 1, j), end: j };
		}
	}
	return { text: s.slice(openIdx + 1), end: s.length - 1 };
}

/** Index just past the heredoc terminator line (or end of input). */
function skipHeredocBody(script: string, start: number, h: Heredoc): number {
	let pos = start;
	while (pos < script.length) {
		const nl = script.indexOf("\n", pos);
		const end = nl === -1 ? script.length : nl;
		const line = script.slice(pos, end);
		pos = nl === -1 ? script.length : nl + 1;
		if ((h.dash ? line.replace(/^\t+/, "") : line) === h.delim) break;
	}
	return pos;
}

/** Parse `<<[-]DELIM` at index i; returns the heredoc and the index just past the delimiter word. */
function parseHeredocStart(script: string, i: number): { heredoc: Heredoc; end: number } | undefined {
	let j = i + 2;
	let dash = false;
	if (script[j] === "-") {
		dash = true;
		j += 1;
	}
	while (script[j] === " " || script[j] === "\t") j += 1;
	let delim = "";
	if (script[j] === "'" || script[j] === '"') {
		const q = script[j];
		const close = script.indexOf(q, j + 1);
		if (close === -1) return undefined;
		delim = script.slice(j + 1, close);
		j = close + 1;
	} else {
		const m = /^[^\s;|&()<>]+/.exec(script.slice(j));
		if (!m) return undefined;
		delim = m[0];
		j += m[0].length;
	}
	return { heredoc: { delim, dash }, end: j };
}

function scan(script: string): { raw: RawSegment[]; inner: string[] } {
	const raw: RawSegment[] = [];
	const inner: string[] = [];
	let pending: Heredoc[] = [];
	let cur = "";
	let quote: "'" | '"' | null = null;

	const flush = (endedBy: string) => {
		const t = cur.trim();
		if (t) raw.push({ text: t, endedBy });
		cur = "";
	};

	for (let i = 0; i < script.length; i++) {
		const c = script[i];
		const next = script[i + 1];

		if (quote === "'") {
			cur += c;
			if (c === "'") quote = null;
			continue;
		}
		if (c === "\\") {
			cur += c + (next ?? "");
			i += 1;
			continue;
		}
		if (quote === '"') {
			if (c === '"') {
				quote = null;
				cur += c;
			} else if (c === "$" && next === "(") {
				const sub = readBalanced(script, i + 1);
				inner.push(sub.text);
				cur += script.slice(i, sub.end + 1);
				i = sub.end;
			} else if (c === "`") {
				const close = script.indexOf("`", i + 1);
				const end = close === -1 ? script.length - 1 : close;
				inner.push(script.slice(i + 1, end));
				cur += script.slice(i, end + 1);
				i = end;
			} else {
				cur += c;
			}
			continue;
		}

		// unquoted
		if (c === "'" || c === '"') {
			quote = c;
			cur += c;
		} else if (c === "\n") {
			flush("\n");
			for (const h of pending) i = skipHeredocBody(script, i + 1, h) - 1;
			pending = [];
		} else if (c === ";") {
			flush(";");
		} else if (c === "|") {
			const kind = next === "|" ? "||" : next === "&" ? "|&" : "|";
			flush(kind);
			if (kind !== "|") i += 1;
		} else if (c === "&") {
			if (next === "&") {
				flush("&&");
				i += 1;
			} else if (script[i - 1] === ">" || next === ">") {
				cur += c; // 2>&1 and &>
			} else {
				flush("&");
			}
		} else if (c === "(" || c === ")" || c === "`") {
			flush(c);
		} else if (c === "<" && next === "<" && script[i + 2] !== "<") {
			const parsed = parseHeredocStart(script, i);
			if (parsed) {
				pending.push(parsed.heredoc);
				cur += script.slice(i, parsed.end);
				i = parsed.end - 1;
			} else {
				cur += c;
			}
		} else {
			cur += c;
		}
	}
	flush("end");
	return { raw, inner };
}

export function splitSegmentsDetailed(script: string): Segment[] {
	const { raw, inner } = scan(script);
	const isPipe = (e: string) => e === "|" || e === "|&";
	const own: Segment[] = raw.map((r, k) => ({
		text: r.text,
		pipedIn: k > 0 && isPipe(raw[k - 1].endedBy),
		pipedOut: isPipe(r.endedBy),
		background: r.endedBy === "&",
	}));
	return [...own, ...inner.flatMap(splitSegmentsDetailed)];
}

export function splitSegments(script: string): string[] {
	return splitSegmentsDetailed(script).map((s) => s.text);
}

/** Split one segment into words, honouring quotes and backslashes and removing the quote characters. */
export function tokenize(segment: string): string[] {
	const tokens: string[] = [];
	let cur = "";
	let started = false;
	let quote: "'" | '"' | null = null;

	for (let i = 0; i < segment.length; i++) {
		const c = segment[i];
		if (quote === "'") {
			if (c === "'") quote = null;
			else cur += c;
		} else if (quote === '"') {
			if (c === '"') {
				quote = null;
			} else if (c === "\\" && /["\\$`]/.test(segment[i + 1] ?? "")) {
				cur += segment[i + 1];
				i += 1;
			} else {
				cur += c;
			}
		} else if (c === "'" || c === '"') {
			quote = c;
			started = true;
		} else if (c === "\\" && i + 1 < segment.length) {
			cur += segment[i + 1];
			i += 1;
			started = true;
		} else if (/\s/.test(c)) {
			if (started) {
				tokens.push(cur);
				cur = "";
				started = false;
			}
		} else {
			cur += c;
			started = true;
		}
	}
	if (started) tokens.push(cur);
	return tokens;
}

const PREFIX_WORDS = new Set(["env", "command", "builtin", "exec", "time", "!", "{", "if", "then", "else", "elif", "do", "while", "until"]);

/** Drop leading `NAME=value` assignments and transparent prefix words, leaving the real command first. */
export function stripPrefixes(tokens: string[]): string[] {
	let i = 0;
	while (i < tokens.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i]) || PREFIX_WORDS.has(tokens[i]))) i += 1;
	return tokens.slice(i);
}

/** Convenience: every segment of a script as its real command tokens (prefixes stripped, empty ones dropped). */
export function commandsOf(script: string): string[][] {
	return splitSegments(script)
		.map((s) => stripPrefixes(tokenize(s)))
		.filter((t) => t.length > 0);
}

const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
const MAX_SHELL_DEPTH = 3;

/**
 * Like splitSegmentsDetailed, but also follows scripts handed to a shell with -c
 * (`sh -c '...'`, `bash -lc "..."`), recursively, so commands wrapped that way are not invisible.
 */
export function deepSegments(script: string, depth = 0): Segment[] {
	const segs = splitSegmentsDetailed(script);
	if (depth >= MAX_SHELL_DEPTH) return segs;
	const extra: Segment[] = [];
	for (const seg of segs) {
		const t = stripPrefixes(tokenize(seg.text));
		if (t.length === 0 || !SHELLS.has(basename(t[0]))) continue;
		const ci = t.findIndex((a, i) => i > 0 && /^-[A-Za-z]*c[A-Za-z]*$/.test(a));
		const body = ci === -1 ? undefined : t[ci + 1];
		if (body !== undefined) extra.push(...deepSegments(body, depth + 1));
	}
	return [...segs, ...extra];
}

export function segmentsDeep(script: string): string[] {
	return deepSegments(script).map((s) => s.text);
}
