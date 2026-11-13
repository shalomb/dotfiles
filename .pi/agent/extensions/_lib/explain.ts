/**
 * /explain <term> hierarchical resolver.
 *
 * Resolves a term economically through 4 concentric rings:
 *  - Ring 1: Session Context (active conversation messages)
 *  - Ring 2: Workspace Docs (ADRs, glossaries, documentation markdown files)
 *  - Ring 3: Symbols & Code (targeted declarations, functions, classes)
 *  - Ring 4: Harness / Skills (installed skills, command definitions)
 *
 * Fast, deterministic scanning with compact formatting to eliminate unnecessary LLM calls.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { homedir } from "node:os";

export type ExplainRing = "session" | "docs" | "code" | "harness";

export interface SessionMessage {
	role: string;
	content: unknown;
}

export interface ExplainArgs {
	raw: string;
	term: string;
	ring?: ExplainRing;
	json?: boolean;
}

export interface ExplainMatch {
	ring: ExplainRing;
	title: string;
	source: string;
	snippet: string;
	confidence: number;
}

export interface ExplainResolution {
	term: string;
	resolved: boolean;
	primaryRing?: ExplainRing;
	matches: ExplainMatch[];
}

export function parseExplainArgs(rawArgs: string): ExplainArgs {
	const raw = rawArgs.trim();
	if (!raw) {
		return { raw: "", term: "" };
	}

	let text = raw;
	let json = false;
	let ring: ExplainRing | undefined;

	if (text.includes("--json")) {
		json = true;
		text = text.replace(/--json\b/g, "").trim();
	}

	const ringMatch = /--ring[ =](\w+)/.exec(text) || /-r\s+(\w+)/.exec(text);
	if (ringMatch) {
		const val = ringMatch[1].toLowerCase();
		if (val === "session" || val === "docs" || val === "code" || val === "harness") {
			ring = val as ExplainRing;
		}
		text = text.replace(ringMatch[0], "").trim();
	}

	return {
		raw,
		term: text.replace(/\s+/g, " ").trim(),
		ring,
		json,
	};
}

function extractTextFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((c) => {
				if (typeof c === "string") return c;
				if (c && typeof c === "object" && "text" in c && typeof (c as any).text === "string") {
					return (c as any).text;
				}
				return "";
			})
			.join(" ");
	}
	if (content && typeof content === "object" && "text" in content && typeof (content as any).text === "string") {
		return (content as any).text;
	}
	return "";
}

function truncateLines(text: string, maxLines = 5, maxChars = 300): string {
	const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
	const joined = lines.slice(0, maxLines).join(" ");
	if (joined.length <= maxChars) return joined;
	return joined.slice(0, maxChars) + "…";
}

/**
 * Ring 1: Session Context lookup
 */
export function resolveRing1Session(term: string, messages: SessionMessage[]): ExplainMatch[] {
	if (!term.trim() || !messages.length) return [];
	const lowerTerm = term.toLowerCase();
	const matches: ExplainMatch[] = [];

	// Search backwards from newest to oldest
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		const text = extractTextFromContent(msg.content);
		if (!text) continue;

		const lower = text.toLowerCase();
		const idx = lower.indexOf(lowerTerm);
		if (idx !== -1) {
			// Find paragraph or line surrounding idx
			const start = Math.max(0, text.lastIndexOf("\n", idx) + 1);
			let end = text.indexOf("\n", idx + lowerTerm.length);
			if (end === -1) end = text.length;

			const line = text.slice(start, end).trim();
			const snippet = truncateLines(line || text.slice(Math.max(0, idx - 40), Math.min(text.length, idx + 160)));

			matches.push({
				ring: "session",
				title: "Session Context",
				source: `${msg.role} message #${i + 1}`,
				snippet,
				confidence: 0.95,
			});

			if (matches.length >= 3) break;
		}
	}

	return matches;
}

/**
 * Ring 2: Workspace Documentation (ADRs, docs, markdown glossaries, AGENTS.md)
 */
export function resolveRing2WorkspaceDocs(term: string, options: { rootDir: string }): ExplainMatch[] {
	const root = options.rootDir;
	if (!existsSync(root)) return [];
	const lowerTerm = term.toLowerCase();
	const matches: ExplainMatch[] = [];

	// Candidate doc files/directories
	const searchPaths = [
		join(root, "docs"),
		join(root, ".pi", "docs"),
		join(root, "AGENTS.md"),
		join(root, "README.md"),
	];

	const mdFiles: string[] = [];

	for (const p of searchPaths) {
		if (!existsSync(p)) continue;
		try {
			const st = statSync(p);
			if (st.isFile() && p.endsWith(".md")) {
				mdFiles.push(p);
			} else if (st.isDirectory()) {
				const walk = (dir: string, depth = 0) => {
					if (depth > 4) return;
					const entries = readdirSync(dir);
					for (const entry of entries) {
						if (entry.startsWith(".") && entry !== ".pi") continue;
						const full = join(dir, entry);
						try {
							const s = statSync(full);
							if (s.isDirectory()) walk(full, depth + 1);
							else if (entry.endsWith(".md") || entry.endsWith(".markdown")) mdFiles.push(full);
						} catch {}
					}
				};
				walk(p);
			}
		} catch {}
	}

	for (const file of mdFiles) {
		try {
			const content = readFileSync(file, "utf8");
			const lower = content.toLowerCase();
			const idx = lower.indexOf(lowerTerm);
			if (idx !== -1) {
				// Extract definition / surrounding context
				const start = Math.max(0, content.lastIndexOf("\n\n", idx) + 2);
				let end = content.indexOf("\n\n", idx + lowerTerm.length);
				if (end === -1) end = content.length;

				const block = content.slice(start, end).trim();
				const relPath = relative(root, file);

				matches.push({
					ring: "docs",
					title: basename(file, extname(file)),
					source: relPath,
					snippet: truncateLines(block),
					confidence: 0.9,
				});

				if (matches.length >= 5) break;
			}
		} catch {}
	}

	return matches;
}

function collectCodeFiles(root: string): string[] {
	const codeDirs = [join(root, "src"), join(root, "lib"), join(root, ".pi", "agent", "extensions")];
	const validExts = new Set([".ts", ".js", ".py", ".go", ".rs", ".sh"]);
	const out: string[] = [];

	const walk = (dir: string, depth = 0) => {
		if (depth > 4) return;
		try {
			for (const entry of readdirSync(dir)) {
				if (entry.startsWith(".") || entry === "node_modules" || entry === "dist") continue;
				const full = join(dir, entry);
				const s = statSync(full);
				if (s.isDirectory()) walk(full, depth + 1);
				else if (validExts.has(extname(entry)) && !entry.endsWith(".test.ts") && !entry.endsWith(".spec.ts")) {
					out.push(full);
				}
			}
		} catch {}
	};

	for (const d of codeDirs) {
		if (existsSync(d)) walk(d);
	}
	return out;
}

function findSymbolMatchInFile(file: string, term: string, root: string): ExplainMatch | undefined {
	const declPrefixes = ["export function ", "function ", "export class ", "class ", "export interface ", "interface ", "export type ", "type ", "export const ", "const ", "export let ", "let ", "def "];
	try {
		const content = readFileSync(file, "utf8");
		const lines = content.split(/\r?\n/);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			const matched = declPrefixes.some((p) => line.startsWith(p) && line.slice(p.length).trimStart().startsWith(term));
			if (matched) {
				const block = lines.slice(i, Math.min(lines.length, i + 5)).join("\n");
				return {
					ring: "code",
					title: `Symbol: ${term}`,
					source: relative(root, file),
					snippet: truncateLines(block),
					confidence: 0.85,
				};
			}
		}
	} catch {}
	return undefined;
}

/**
 * Ring 3: Symbols & Code (exported declarations, functions, classes, types)
 */
export function resolveRing3SymbolsAndCode(term: string, options: { rootDir: string }): ExplainMatch[] {
	const root = options.rootDir;
	if (!existsSync(root)) return [];
	const cleanIdent = term.trim();
	if (!cleanIdent) return [];

	const matches: ExplainMatch[] = [];
	for (const file of collectCodeFiles(root)) {
		const match = findSymbolMatchInFile(file, cleanIdent, root);
		if (match) {
			matches.push(match);
			if (matches.length >= 3) break;
		}
	}
	return matches;
}

/**
 * Ring 4: Harness / Skills (installed skills, agents, commands)
 */
export function resolveRing4HarnessSkills(term: string, options: { rootDir: string }): ExplainMatch[] {
	const root = options.rootDir;
	const matches: ExplainMatch[] = [];
	const lowerTerm = term.toLowerCase();

	const candidateSkillDirs = [
		join(root, ".pi", "skills"),
		join(root, ".claude", "skills"),
		join(homedir(), ".pi", "profiles", "personal", "skills"),
		join(homedir(), ".pi", "agent", "skills"),
	];

	for (const base of candidateSkillDirs) {
		if (!existsSync(base)) continue;
		try {
			const entries = readdirSync(base);
			for (const entry of entries) {
				if (entry.startsWith(".")) continue;
				const full = join(base, entry);
				const skillMd = join(full, "SKILL.md");
				if (existsSync(skillMd)) {
					const nameMatches = entry.toLowerCase().includes(lowerTerm);
					try {
						const text = readFileSync(skillMd, "utf8");
						if (nameMatches || text.toLowerCase().includes(lowerTerm)) {
							// Extract description or frontmatter
							const descMatch = /description:\s*([^\n\r]+)/i.exec(text);
							const snippet = descMatch ? descMatch[1].trim() : truncateLines(text);
							matches.push({
								ring: "harness",
								title: `Skill: ${entry}`,
								source: relative(root, skillMd),
								snippet,
								confidence: nameMatches ? 0.9 : 0.75,
							});
							if (matches.length >= 3) return matches;
						}
					} catch {}
				}
			}
		} catch {}
	}

	return matches;
}

/**
 * Concentric Ring Resolver Orchestration
 */
export async function resolveTerm(
	term: string,
	options: {
		messages?: SessionMessage[];
		rootDir?: string;
		targetRing?: ExplainRing;
	} = {}
): Promise<ExplainResolution> {
	const root = options.rootDir ? resolve(options.rootDir) : process.cwd();
	const cleanTerm = term.trim();
	if (!cleanTerm) {
		return { term: "", resolved: false, matches: [] };
	}

	const messages = options.messages || [];
	const matches: ExplainMatch[] = [];

	// Ring 1: Session
	if (!options.targetRing || options.targetRing === "session") {
		const m1 = resolveRing1Session(cleanTerm, messages);
		if (m1.length) {
			matches.push(...m1);
			if (!options.targetRing) {
				return {
					term: cleanTerm,
					resolved: true,
					primaryRing: "session",
					matches,
				};
			}
		}
	}

	// Ring 2: Docs
	if (!options.targetRing || options.targetRing === "docs") {
		const m2 = resolveRing2WorkspaceDocs(cleanTerm, { rootDir: root });
		if (m2.length) {
			matches.push(...m2);
			if (!options.targetRing) {
				return {
					term: cleanTerm,
					resolved: true,
					primaryRing: "docs",
					matches,
				};
			}
		}
	}

	// Ring 3: Code
	if (!options.targetRing || options.targetRing === "code") {
		const m3 = resolveRing3SymbolsAndCode(cleanTerm, { rootDir: root });
		if (m3.length) {
			matches.push(...m3);
			if (!options.targetRing) {
				return {
					term: cleanTerm,
					resolved: true,
					primaryRing: "code",
					matches,
				};
			}
		}
	}

	// Ring 4: Harness
	if (!options.targetRing || options.targetRing === "harness") {
		const m4 = resolveRing4HarnessSkills(cleanTerm, { rootDir: root });
		if (m4.length) {
			matches.push(...m4);
			if (!options.targetRing) {
				return {
					term: cleanTerm,
					resolved: true,
					primaryRing: "harness",
					matches,
				};
			}
		}
	}

	return {
		term: cleanTerm,
		resolved: matches.length > 0,
		primaryRing: matches[0]?.ring,
		matches,
	};
}

/**
 * Output Formatter
 */
export function formatExplanation(res: ExplainResolution): string {
	if (!res.resolved || !res.matches.length) {
		return `\x1b[33mNo explanation found for '${res.term}'.\x1b[0m\nConsulted rings: session context, workspace docs, codebase symbols, and agent skills.`;
	}

	const lines: string[] = [
		`\x1b[1;36m━━ Explain: ${res.term} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
	];

	for (const m of res.matches) {
		lines.push(`\x1b[1;33m[${m.ring}]\x1b[0m \x1b[1m${m.title}\x1b[0m  \x1b[2m(${m.source})\x1b[0m`);
		lines.push(`  ${m.snippet}`);
		lines.push("");
	}

	return lines.join("\n").trim();
}
