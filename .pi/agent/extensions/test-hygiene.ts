/**
 * Test Hygiene
 *
 * Checks the content being written into TEST files against Farley's
 * Fast / Repeatable / Atomic / Necessary properties, using patterns that are
 * cheap to see in the text of an edit:
 *   - sleeps                      (Fast)
 *   - real network calls          (Fast, Repeatable)
 *   - un-frozen wall clock        (Repeatable)
 *   - tests with no assertion     (Necessary: proves nothing)
 *   - many new tests in one write (Canon TDD: one test at a time) — advisory only
 *
 * Mode (env PI_TDD_HYGIENE, or PI_TDD for all TDD guards): off | warn (default) | block.
 * warn appends a note to the write/edit result; block refuses the write.
 * The "many tests" check never blocks.
 *
 * These are heuristics over the added text only (no AST, no whole-file view),
 * so false positives exist — hence warn by default. Mocked/patched lines and
 * files that use a clock freezer are exempt from the related check.
 *
 * Load location: ~/.pi/agent/extensions/test-hygiene.ts (global)
 */

import { resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { addedText, isScratchPath, isTestFile, readMode } from "./_lib/test-files.ts";

export interface Finding {
	kind: "sleep" | "network" | "clock" | "no-assertion" | "many-tests";
	message: string;
	hard: boolean; // eligible to block
}

const SLEEP = /\b(?:time\.sleep|asyncio\.sleep|Thread\.sleep|std::thread::sleep|time\.Sleep)\s*\(|(?:^|[\s;&(])sleep\s+\d|\bawait\s+sleep\s*\(|setTimeout\s*\([^)]*,\s*\d{3,}\)/;

const NETWORK =
	/\b(?:requests|httpx|aiohttp|urllib3?)\.(?:get|post|put|patch|delete|head|request|urlopen)\s*\(|\burllib\.request\.urlopen\s*\(|\bfetch\s*\(\s*['"`]https?:|\baxios\.(?:get|post|put|patch|delete|request)\s*\(|\bhttp\.(?:Get|Post)\s*\(|\bcurl\s+-?\S*\s*https?:|\bboto3\.client\s*\(|\bsocket\.create_connection\s*\(/;

const NETWORK_OK_LINE = /localhost|127\.0\.0\.1|example\.(?:com|org|net)/i;
// Mocks are normally set up on other lines (decorators, fixtures), so these exempt the whole added text.
const NETWORK_MOCKED = /\bmock|\bpatch\b|\bstub\b|\bfake\b|\brespx|\bresponses\.|\bnock\b|\bvcr\b|\bcassette/i;

const CLOCK =
	/\bdatetime\.(?:now|utcnow|today)\s*\(|\bdate\.today\s*\(|\btime\.time\s*\(|\bDate\.now\s*\(|\bnew\s+Date\s*\(\s*\)|\bInstant\.now\s*\(|\btime\.Now\s*\(|\bSystemTime::now\s*\(/;

const CLOCK_FROZEN = /freezegun|freeze_time|time[-_]machine|useFakeTimers|setSystemTime|mockdate|\bclock\b|monkeypatch|mock\.patch|jest\.spyOn\(Date|vi\.spyOn\(Date/i;

const DECLARATION = /^\s*(?:def\s+test_\w+|async\s+def\s+test_\w+|(?:it|test)(?:\.each\([^)]*\))?\s*\(\s*['"`]|func\s+Test\w+\s*\(|#\[test\]|run\s+"[^"]+"\s*\{|@test\s+['"])/gm;

const ASSERTION =
	/\bassert\w*\b|pytest\.raises|\bexpect\s*\(|\.should\b|\bt\.(?:Error|Errorf|Fatal|Fatalf|Fail|FailNow)\b|\brequire\.\w+|\bassert!|\bassert_eq!|\bassert_ne!|\bpanic!|\bself\.assert|^\s*\[\[?\s|^\s*run\s+\S|\$status|\bassert\s*\{|\bcondition\s*=|\berror_message\s*=/m;

const MANY_TESTS = 3;

export function analyse(text: string): Finding[] {
	const findings: Finding[] = [];
	const lines = text.split("\n");

	const sleep = lines.find((l) => SLEEP.test(l));
	if (sleep) {
		findings.push({
			kind: "sleep",
			hard: true,
			message: `a sleep (\`${sleep.trim().slice(0, 60)}\`) makes the test slow; wait on a condition, or inject/fake the clock`,
		});
	}

	const net = NETWORK_MOCKED.test(text) ? undefined : lines.find((l) => NETWORK.test(l) && !NETWORK_OK_LINE.test(l));
	if (net) {
		findings.push({
			kind: "network",
			hard: true,
			message: `a real network/cloud call (\`${net.trim().slice(0, 60)}\`) is slow and non-repeatable; fake it at the boundary (mock, stub, local server)`,
		});
	}

	if (!CLOCK_FROZEN.test(text)) {
		const clock = lines.find((l) => CLOCK.test(l));
		if (clock) {
			findings.push({
				kind: "clock",
				hard: true,
				message: `the wall clock (\`${clock.trim().slice(0, 60)}\`) is read without being frozen/injected; the result depends on when it runs`,
			});
		}
	}

	const declarations = text.match(DECLARATION) ?? [];
	if (declarations.length > 0 && !ASSERTION.test(text)) {
		findings.push({
			kind: "no-assertion",
			hard: true,
			message: `${declarations.length} test(s) added with no assertion; a test that cannot fail proves nothing`,
		});
	}
	if (declarations.length > MANY_TESTS) {
		findings.push({
			kind: "many-tests",
			hard: false,
			message: `${declarations.length} tests added at once; Canon TDD is one test at a time — convert one item from the test list, make it pass, then the next`,
		});
	}

	return findings;
}

function format(path: string, findings: Finding[]): string {
	return `Test hygiene (${path}):\n${findings.map((f) => `  - ${f.message}`).join("\n")}`;
}

export default function (pi: ExtensionAPI) {
	const scan = (toolName: string, input: Record<string, unknown>, cwd: string): { path: string; findings: Finding[] } | undefined => {
		if (toolName !== "write" && toolName !== "edit") return undefined;
		const path = String(input.path ?? "");
		if (!path) return undefined;
		const full = resolve(cwd, path);
		if (isScratchPath(full) || !isTestFile(full)) return undefined;
		const text = addedText(toolName, input);
		if (!text.trim()) return undefined;
		const findings = analyse(text);
		return findings.length > 0 ? { path, findings } : undefined;
	};

	pi.on("tool_call", async (event, ctx) => {
		if (readMode("PI_TDD_HYGIENE", "warn") !== "block") return undefined;
		const hit = scan(event.toolName, event.input as Record<string, unknown>, ctx.cwd);
		const hard = hit?.findings.filter((f) => f.hard);
		if (!hit || !hard || hard.length === 0) return undefined;
		const reason = `Blocked: ${format(hit.path, hard)}\nFix these, or ask the user if the exception is intended.`;
		if (ctx.hasUI) ctx.ui.notify(reason, "warning");
		return { block: true, reason };
	});

	pi.on("tool_result", async (event, ctx) => {
		const mode = readMode("PI_TDD_HYGIENE", "warn");
		if (mode === "off" || event.isError) return undefined;
		const hit = scan(event.toolName, event.input as Record<string, unknown>, ctx.cwd);
		if (!hit) return undefined;
		// In block mode hard findings were already refused; only advisory ones remain.
		const findings = mode === "block" ? hit.findings.filter((f) => !f.hard) : hit.findings;
		if (findings.length === 0) return undefined;
		const note = format(hit.path, findings);
		if (ctx.hasUI) ctx.ui.notify(note, "warning");
		return { content: [...event.content, { type: "text" as const, text: `\n\n${note}` }] };
	});
}
