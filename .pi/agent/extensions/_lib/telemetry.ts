// AGENT_CONTEXT: log each hop (key result, moved, tokens, ms) to trajectories.jsonl and summarize the log per key result.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface HopInput { kr: string; moved: boolean; tokens: number; ms: number; at: string }
export interface HopEvent extends HopInput { event: "hop" }
export type Summary = Record<string, { hops: number; moved: number; tokens: number; ms: number }>;

const cost = (n: number) => Number.isFinite(n) && n >= 0;

export function hopEvent(i: HopInput): HopEvent {
	if (!/^KR-\d+\.\d+$/.test(i.kr)) throw new Error(`bad key result: ${i.kr}`);
	if (!cost(i.tokens) || !cost(i.ms)) throw new Error("tokens and ms must be finite and >= 0");
	return { event: "hop", kr: i.kr, moved: i.moved, tokens: i.tokens, ms: i.ms, at: i.at };
}

const logPath = (store: string) => join(store, "trajectories.jsonl");

export function logHop(store: string, ev: HopEvent): void {
	mkdirSync(store, { recursive: true });
	appendFileSync(logPath(store), `${JSON.stringify(ev)}\n`);
}

export function readHops(store: string): HopEvent[] {
	const p = logPath(store);
	if (!existsSync(p)) return [];
	const out: HopEvent[] = [];
	for (const line of readFileSync(p, "utf8").split("\n")) {
		try {
			const v = JSON.parse(line);
			if (v && v.event === "hop") out.push(v);
		} catch {}
	}
	return out;
}

export function summarize(evs: HopEvent[]): Summary {
	const s: Summary = {};
	for (const e of evs) {
		const r = (s[e.kr] ??= { hops: 0, moved: 0, tokens: 0, ms: 0 });
		r.hops++;
		if (e.moved) r.moved++;
		r.tokens += e.tokens;
		r.ms += e.ms;
	}
	return s;
}
