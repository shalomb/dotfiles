// AGENT_CONTEXT: prove arrival by replay — parse a Serves commit's trailers into a hop record, recompute its road class from the diff, and verify its check was red at base and green at head.
import { checkWeakening, type GateInput, isStewardPath } from "./drive-gate";
export type Road = "motorway" | "city";

export interface Hop {
	sha: string;
	serves: string;
	road: Road;
	check: string;
	baseSha: string;
	baseExit: number;
	headGreen: boolean;
	gate: string;
	lesson: string;
}
export interface Run {
	exitAtBase: number;
	exitAtHead: number;
	linesChanged: number;
	touchedPaths: string[];
	/** The base..head diff with added/removed lines; when given, G2 and G3 are audited too. */
	changed?: GateInput["changed"];
}
export type Verdict = { ok: true } | { ok: false; reason: string };

const END_STATE_DOC = "docs/explanation/end-state-evolution.md";
const REQUIRED = ["Serves", "Road", "Check", "Check-Base", "Check-Head", "Gate", "Lesson"];

export function parseHopCommit(sha: string, message: string): Hop | null {
	const block = message.trimEnd().split(/\n\s*\n/).pop() ?? "";
	const t: Record<string, string> = {};
	for (const line of block.split("\n")) {
		const m = line.match(/^([A-Za-z][A-Za-z-]*):\s*(.+?)\s*$/);
		if (m) t[m[1]] = m[2];
	}
	if (REQUIRED.some((k) => !t[k])) return null;
	if (t.Road !== "motorway" && t.Road !== "city") return null;
	const base = t["Check-Base"].match(/^red \(exit (\d+)\) @ ([0-9a-f]{7,40})$/);
	if (!base || !/^green \(exit 0\)$/.test(t["Check-Head"])) return null;
	return {
		sha,
		serves: t.Serves,
		road: t.Road,
		check: t.Check,
		baseSha: base[2],
		baseExit: Number(base[1]),
		headGreen: true,
		gate: t.Gate,
		lesson: t.Lesson,
	};
}

export function classifyRoad(d: { linesChanged: number; touchedPaths: string[]; check: string }): Road {
	const testFile = d.check.match(/(\S+\.test\.\w+)/)?.[1]?.replace(/^\.\//, "");
	const touchesCheck = !!testFile && d.touchedPaths.some((p) => p === testFile);
	return d.linesChanged > 150 || touchesCheck || d.touchedPaths.includes(END_STATE_DOC) ? "city" : "motorway";
}

export async function replayHop(hop: Hop, run: Run): Promise<Verdict> {
	if (run.exitAtBase === 126 || run.exitAtBase === 127) return { ok: false, reason: "blocked-at-base" };
	if (run.exitAtBase === 0) return { ok: false, reason: "green-at-base" };
	if (run.exitAtHead !== 0) return { ok: false, reason: "red-at-head" };
	if (run.changed) {
		if (run.changed.some((c) => isStewardPath(c.path))) return { ok: false, reason: "steward-path-touched" };
		if (checkWeakening(run.changed).level === "reject") return { ok: false, reason: "g3-weakening" };
	}
	const actual = classifyRoad({ linesChanged: run.linesChanged, touchedPaths: run.touchedPaths, check: hop.check });
	if (hop.road === "motorway" && actual === "city") return { ok: false, reason: "road-mismatch" };
	if (hop.road === "city" && hop.gate !== "drive_gate pass") return { ok: false, reason: "missing-gate" };
	return { ok: true };
}
