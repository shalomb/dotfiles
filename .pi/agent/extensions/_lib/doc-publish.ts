/**
 * doc_publish: render a /doc Markdown source, check it, file it, and return URLs.
 * Rendering is the bundled Python renderer (doc-render/build.py, needs pandoc).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fileDoc } from "./doc-library.ts";
import { type Finding, lintDoc } from "./doc-lint.ts";
import { urlsFor } from "./doc-urls.ts";

type Env = Record<string, string | undefined>;
const HERE = dirname(fileURLToPath(import.meta.url));
export const BUILD = join(HERE, "doc-render", "build.py");

export interface PublishOptions {
	source: string;
	purpose?: string;
	style?: "formal" | "house";
	tags?: string[];
	eyebrow?: string;
	summary?: string;
	downloads?: string;
}
export interface PublishResult {
	rendered: string[];
	filed: string[];
	urls: string[];
	findings: Finding[];
	brandCss?: string;
}

/** Library kind for a purpose (the library keeps its historical kinds). */
const KIND: Record<string, string> = { decision: "decision", report: "report", status: "status", workshop: "workshop", deck: "deck" };

/** The brand stylesheet for formal style: from brands.py for this path, else the only *.css in the brand folder. */
export function formalCss(source: string, env: Env = process.env): string | undefined {
	try {
		const out = execFileSync("python3", [join(HERE, "doc-render", "brands.py"), "resolve", source], { encoding: "utf8", env: env as NodeJS.ProcessEnv, stdio: ["ignore", "pipe", "ignore"] });
		const css = JSON.parse(out).css as string | null;
		if (css) return css;
	} catch {
		/* no brand config: fall through */
	}
	const dir = join(env.XDG_CONFIG_HOME || join(homedir(), ".config"), "agent-skills", "brands");
	if (!existsSync(dir)) return undefined;
	const css = readdirSync(dir).filter((f) => f.endsWith(".css"));
	return css.length === 1 ? join(dir, css[0]) : undefined;
}

export function publishDoc(o: PublishOptions, env: Env = process.env): PublishResult {
	if (!existsSync(o.source)) throw new Error(`no such source: ${o.source}`);
	const purpose = o.purpose ?? "report";
	const kind = KIND[purpose] ?? "report";
	const stem = basename(o.source).replace(/\.md$/i, "").toLowerCase();
	const downloads = o.downloads ?? join(homedir(), "Downloads");
	const brandCss = o.style === "formal" ? formalCss(o.source, env) : undefined;
	const md = readFileSync(o.source, "utf8");
	const findings = lintDoc(md, purpose);

	const modes: ("doc" | "deck")[] = purpose === "deck" ? ["doc", "deck"] : ["doc"];
	const rendered: string[] = [];
	const filed: string[] = [];
	for (const mode of modes) {
		const out = join(downloads, `${stem}${mode === "deck" ? "-deck" : ""}.html`);
		const args = [BUILD, o.source, "-m", mode, "-o", out];
		if (o.eyebrow) args.push("-e", o.eyebrow);
		if (brandCss) args.push("--brand-css", brandCss);
		try {
			execFileSync("python3", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
		} catch (e) {
			throw new Error(`render failed (${mode}): ${(e as { stderr?: string }).stderr?.trim() || (e as Error).message}`);
		}
		rendered.push(out);
		const fileKind = mode === "deck" ? "deck" : kind === "deck" ? "report" : kind;
		filed.push(fileDoc({ html: out, kind: fileKind, source: o.source, summary: o.summary, tags: o.tags }, env));
	}
	const urls = filed.flatMap((f) => urlsFor(f).map((u) => u.url));
	return { rendered, filed, urls, findings, brandCss };
}
