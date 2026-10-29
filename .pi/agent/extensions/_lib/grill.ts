// Pure logic for /grill-me rounds: validate a round, render the vim round file,
// and compute the compact delta between the rendered file and the user's reply.
// The model never re-reads the reply: it already holds the round it sent.
// Tested in grill.test.ts.

import { isAbsolute, join } from "node:path";

export type Stance = "long-horizon" | "mid-execution";
export interface Option { label: string; tradeoff: string }
export interface Question {
	id: string;
	title: string;
	context: string[];
	options: Option[];
	recommended: number;
	diagram?: string;
}
export interface Term { term: string; definition?: string; avoid?: string[] }
export interface Round {
	topic: string;
	stance: Stance;
	questions: Question[];
	terms?: Term[];
	review?: string;
}
export interface Delta { empty: boolean; text: string }

export const WIDTH = 72;
const LETTERS = "ABCDE";
const ID = /^[a-z0-9][a-z0-9._-]*$/;
const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;
const BOX = /^\s*\[(.)\]\s+([A-Z])\.\s+(.*)$/;
const QHEAD = /^## (Q\d+) \[([^\]]+)\]/;

export function stateDir(env: Record<string, string | undefined>, home: string): string {
	const xdg = env.XDG_STATE_HOME;
	return join(xdg && isAbsolute(xdg) ? xdg : join(home, ".local", "state"), "pi", "grill");
}

export function validateRound(r: Round): string | undefined {
	if (!r.topic?.trim()) return "topic is empty";
	if (r.questions.length > 7) return "too many questions (max 7): ask the rest in a later round";
	if (r.questions.length === 0 && !r.review?.trim()) return "a round needs questions, or a review body";
	const ids = new Set<string>();
	for (const q of r.questions) {
		if (!ID.test(q.id)) return `question id "${q.id}" must match ${ID}`;
		if (ids.has(q.id)) return `duplicate question id "${q.id}"`;
		ids.add(q.id);
		if (/\n/.test(q.title)) return `title of ${q.id} has a line break`;
		if (q.options.length < 2 || q.options.length > LETTERS.length) return `${q.id} needs 2 to ${LETTERS.length} options`;
		if (!Number.isInteger(q.recommended) || q.recommended < 0 || q.recommended >= q.options.length)
			return `${q.id}: recommended must be an option index from 0 to ${q.options.length - 1}`;
		for (const line of (q.diagram ?? "").split("\n")) {
			if (line.length > WIDTH - 2) return `${q.id}: diagram line longer than ${WIDTH - 2} columns`;
			if (!PRINTABLE_ASCII.test(line)) return `${q.id}: diagram must be printable ASCII`;
		}
	}
	return undefined;
}

export function wrap(text: string, indent: number, width = WIDTH): string[] {
	const pad = " ".repeat(indent);
	const out: string[] = [];
	let line = "";
	for (const word of text.trim().split(/\s+/)) {
		if (line && pad.length + line.length + 1 + word.length > width) {
			out.push(pad + line);
			line = word;
		} else line = line ? `${line} ${word}` : word;
	}
	if (line) out.push(pad + line);
	return out;
}

const STANCE: Record<Stance, string> = {
	"long-horizon": "long horizon. The current code is evidence, not authority.",
	"mid-execution": "mid-execution. The current code and accepted ADRs are the foundation.",
};

export function renderRound(r: Round, n: number): string {
	const L: string[] = [
		`# GRILL ROUND ${n} -- topic: ${r.topic}`,
		`# STANCE: ${STANCE[r.stance]}`,
		"#",
		"# KEYS:  ]q / [q  next / previous section",
		"#        <Space>  select the option on this line",
		"#        >>       write a reply under this line",
		"#        :wq      send       :q!  quit without changes, then choose",
		"#",
		"# The recommended option is selected. Change it only if you disagree.",
		"# Write a reply only where you disagree or know more.",
	];
	r.questions.forEach((q, i) => {
		L.push("", `## Q${i + 1} [${q.id}] -- ${q.title}`, "", "CONTEXT:");
		for (const c of q.context) L.push(...wrap(c, 2));
		L.push("", "OPTIONS:");
		q.options.forEach((o, k) => {
			const head = `  [${k === q.recommended ? "x" : " "}] ${LETTERS[k]}. ${o.label.trim()}`;
			L.push(k === q.recommended ? `${head}  (RECOMMENDED)` : head, ...wrap(o.tradeoff, 9));
		});
		if (q.diagram?.trim()) L.push("", "DIAGRAM:", ...q.diagram.replace(/\s+$/, "").split("\n").map((l) => `  ${l}`.trimEnd()));
	});
	if (r.review?.trim()) L.push("", "## REVIEW", "", ...r.review.replace(/\s+$/, "").split("\n").map((l) => `  ${l}`.trimEnd()));
	if (r.terms?.length) {
		L.push("", "## TERMS", "");
		for (const t of r.terms) {
			if (t.definition?.trim()) L.push(...wrap(`${t.term}: ${t.definition}`, 2));
			else L.push(`  [?] ${t.term}: <not sure. Reply with >> to define it.>`);
			if (t.avoid?.length) L.push(`    Avoid: ${t.avoid.join(", ")}`);
		}
	}
	return `${L.join("\n")}\n`;
}

// ---- delta ----

interface Owner { key: string | null; section: string }
interface Hunk { at: number; del: number[]; ins: string[] }

const norm = (s: string) => s.replace(/\s+$/, "");
const isInstruction = (s: string) => s.startsWith("#") && !QHEAD.test(s) && !/^## (TERMS|REVIEW)\b/.test(s);
const clip = (s: string, w = 50) => {
	const t = s.trim();
	return t.length > w ? `${t.slice(0, w - 1)}…` : t;
};

function hunks(A: string[], B: string[]): Hunk[] {
	const n = A.length, m = B.length;
	const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
	for (let i = n - 1; i >= 0; i--)
		for (let j = m - 1; j >= 0; j--)
			L[i][j] = norm(A[i]) === norm(B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
	const out: Hunk[] = [];
	let i = 0, j = 0, last = -1;
	let cur: Hunk | null = null;
	const flush = () => {
		if (cur && (cur.del.length || cur.ins.length)) out.push(cur);
		cur = null;
	};
	while (i < n || j < m) {
		if (i < n && j < m && norm(A[i]) === norm(B[j])) {
			flush();
			last = i++;
			j++;
			continue;
		}
		cur ??= { at: last, del: [], ins: [] };
		if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) cur.ins.push(B[j++]);
		else cur.del.push(i++);
	}
	flush();
	return out;
}

function owners(A: string[]): Owner[] {
	let key: string | null = null, section = "HEAD";
	return A.map((line) => {
		const h = line.match(QHEAD);
		if (h) { key = `${h[1]} ${h[2]}`; section = "HEAD"; }
		const s = line.match(/^(CONTEXT|OPTIONS|DIAGRAM):/);
		if (s) section = s[1];
		if (/^## REVIEW\b/.test(line)) { key = "REVIEW"; section = "REVIEW"; }
		if (/^## TERMS\b/.test(line)) { key = null; section = "TERMS"; }
		const t = section === "TERMS" && line.match(/^\s*(?:\[\?\]\s*)?([^:\s][^:]*):/);
		if (t && t[1].trim() !== "Avoid") key = `TERMS ${t[1].trim()}`;
		return { key, section };
	});
}

/** Ticked options for each question, as `{ "Q1 id": ["A: label"] }`. */
function picks(lines: string[]): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	let cur: string | null = null;
	for (const l of lines) {
		const h = l.match(QHEAD);
		if (h) cur = `${h[1]} ${h[2]}`;
		if (/^## (TERMS|REVIEW)\b/.test(l)) cur = null;
		const b = l.match(BOX);
		if (cur && b && b[1].trim()) (out[cur] ??= []).push(`${b[2]}: ${b[3].replace(/\s+\(RECOMMENDED\)\s*$/, "")}`);
	}
	return out;
}

function wordEdit(a: string, b: string): string {
	const x = a.trim().split(/\s+/), y = b.trim().split(/\s+/);
	let p = 0;
	while (p < x.length && p < y.length && x[p] === y[p]) p++;
	let s = 0;
	while (s < x.length - p && s < y.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
	const lo = Math.max(0, p - 1);
	const span = (w: string[]) => {
		const hi = w.length - Math.max(0, s - 1);
		return `${lo > 0 ? "…" : ""}${w.slice(lo, hi).join(" ")}${hi < w.length ? "…" : ""}`;
	};
	return `"${span(x)}" -> "${span(y)}"`;
}

// The key already names the term or the review, so drop the redundant section label.
const tidySectionNote = (s: string) =>
	s.replace(/^re TERMS "[^"]*": /, "").replace(/^(re|edit|deleted) (TERMS|REVIEW):? /, "$1 ");

export function computeDelta(original: string, reply: string): Delta {
	const A = original.split("\n"), B = reply.split("\n");
	const own = owners(A);
	const isBox = (s: string) => BOX.test(s);
	const notes: Record<string, string[]> = {};
	const push = (key: string | null, s: string) => (notes[key ?? "ROUND"] ??= []).push(s);

	for (const h of hunks(A, B)) {
		const del = h.del.filter((k) => !isInstruction(A[k]) && !isBox(A[k]));
		const ins = h.ins.filter((s) => !isInstruction(s) && !isBox(s) && s.trim() !== "");
		if (!del.length && !ins.length) continue;
		let at = del.length ? del[0] : h.at;
		const { key, section } = own[at] ?? { key: null, section: "HEAD" };
		if (!del.length && section === "OPTIONS")
			for (let k = at; k >= 0 && own[k]?.section === "OPTIONS"; k--)
				if (isBox(A[k])) { at = k; break; }
		if (del.length && ins.length && ins.every((s) => !s.trimStart().startsWith(">>"))) {
			for (let k = 0; k < Math.max(del.length, ins.length); k++)
				push(key, `edit ${section}: ${wordEdit(A[del[k]] ?? "", ins[k] ?? "")}`);
			continue;
		}
		for (const k of del) push(key, `deleted ${section}: "${clip(A[k])}"`);
		const body = ins.map((s) => s.trimStart().replace(/^>>\s?/, "").trim()).join(" ").replace(/\s{2,}/g, " ¶ ").trim();
		const anchor = (A[at] ?? "").replace(/^\s*\[.\]\s+/, "").replace(/\s+\(RECOMMENDED\)\s*$/, "");
		if (body) push(key, `re ${section} "${clip(anchor, 40)}": ${body}`);
	}

	const pa = picks(A), pb = picks(B);
	const out: string[] = [];
	const quiet: string[] = [];
	const questions = A.map((l) => l.match(QHEAD)).filter(Boolean).map((h) => `${h![1]} ${h![2]}`);
	for (const key of questions) {
		const a = pa[key] ?? [], b = pb[key] ?? [];
		const changed = a.join("|") !== b.join("|");
		const n = notes[key] ?? [];
		if (!changed && !n.length) { quiet.push(key); continue; }
		const pick = b.length ? b.map((p) => `"${p}"`).join(" + ") : "none";
		const state =
			b.length > 1 ? "SEVERAL PICKS: ask again"
			: !b.length ? "NO PICK: ask again"
			: n.some((s) => s.includes("?")) ? "OPEN: a note asks a question"
			: changed ? `changed from ${a[0]?.slice(0, 1) ?? "none"}`
			: "recommendation kept";
		out.push(`${key}: pick=${pick} (${state})`, ...n.map((s) => `  ${s}`));
	}
	for (const [key, n] of Object.entries(notes)) {
		if (questions.includes(key)) continue;
		for (const s of n) out.push(`${key}: ${tidySectionNote(s)}`);
	}
	const empty = out.length === 0;
	if (quiet.length) out.push(`Accepted, no notes: ${quiet.join(", ")}`);
	return { empty, text: out.join("\n") };
}
