/**
 * doc_publish: render a /doc Markdown source, check it, file it, and return URLs.
 * Rendering is the bundled Python renderer (doc-render/build.py, needs pandoc).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type BrandConfig, type BrandContext, brandCss as resolveBrandCss } from "./doc-brand.ts";
import { fileDoc } from "./doc-library.ts";
import { type Finding, lintDoc } from "./doc-lint.ts";
import { navCss } from "./doc-nav.ts";
import { type AudienceProfile, embedProvenance, type ProvenanceRecipe } from "./doc-provenance.ts";
import { checkPage, isTemplateType, redactPrivate, renderTemplate, TEMPLATES, type TemplateType } from "./doc-templates.ts";
import { urlsFor } from "./doc-urls.ts";

type Env = Record<string, string | undefined>;
const HERE = dirname(fileURLToPath(import.meta.url));
export const BUILD = join(HERE, "doc-render", "build.py");

export interface PublishOptions {
	/** The Markdown source; with `template`, the structured-input JSON file instead. */
	source: string;
	/** epicmap | readout | decision: render `source` (JSON) with that template instead of Markdown. */
	template?: TemplateType;
	purpose?: string;
	style?: "formal" | "house";
	tags?: string[];
	eyebrow?: string;
	summary?: string;
	downloads?: string;
	/** The user's request; when set, a folded provenance recipe is embedded in each rendered page. */
	prompt?: string;
	/** Extra recipe parameters (purpose and style are always recorded). */
	params?: Record<string, string | number | boolean>;
	audience?: AudienceProfile[];
	/** Source references for the recipe; defaults to the Markdown source's file name. */
	sources?: string[];
	/** Inject the adaptive nav stylesheet (nav.doc-nav layouts) into the page. */
	nav?: boolean;
	/** Corporate brand isolation: the stylesheet is injected inline only in a corporate context. */
	brand?: { ctx: BrandContext; cfg: BrandConfig };
	/** ISO timestamp for the recipe; defaults to now. */
	now?: string;
}
export interface PublishResult {
	rendered: string[];
	filed: string[];
	urls: string[];
	findings: Finding[];
	brandCss?: string;
	provenance?: ProvenanceRecipe;
}

/** Inject a <style> block before </head> (or prepend when the page has none). */
export function injectStyle(page: string, css: string, id: string): string {
	if (!css.trim()) return page;
	const tag = `<style id="${id}">\n${css}\n</style>`;
	const i = page.indexOf("</head>");
	return i < 0 ? tag + page : page.slice(0, i) + tag + "\n" + page.slice(i);
}

/** Library kind for a purpose (the library keeps its historical kinds). */
const KIND: Record<string, string> = { decision: "decision", report: "report", status: "status", workshop: "workshop", deck: "deck", brief: "brief" };

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

/** The page's lede: `meta.lede` of the DATA object the kernel embeds in the page script, if readable. */
function pageLede(page: string): string | undefined {
	const at = page.indexOf("const DATA=");
	if (at < 0) return undefined;
	const start = at + "const DATA=".length;
	let depth = 0;
	let inString = false;
	for (let i = start; i < page.length; i++) {
		const c = page[i];
		if (inString) {
			if (c === "\\") i++;
			else if (c === '"') inString = false;
		} else if (c === '"') inString = true;
		else if (c === "{") depth++;
		else if (c === "}" && --depth === 0) {
			try {
				const lede = (JSON.parse(page.slice(start, i + 1)) as { meta?: { lede?: unknown } }).meta?.lede;
				return typeof lede === "string" && lede.trim() ? lede.replace(/\s*\[r\d+\]/g, "").trim() : undefined;
			} catch {
				return undefined;
			}
		}
	}
	return undefined;
}

/** Temp locations a template page must not name, beside the home paths embedProvenance already masks. */
const TEMP_ROOTS = (): string[] => [tmpdir(), "/tmp", "/var/folders", "/private/var"];

/** Template path: structured JSON in, kernel page out; the post-processing is the same as for Markdown. */
function publishTemplate(o: PublishOptions, type: TemplateType, env: Env): PublishResult {
	if (!isTemplateType(type)) throw new Error(`unknown template type: ${String(type)}`);
	const purpose = TEMPLATES[type].purpose;
	if (o.purpose && o.purpose !== purpose) throw new Error(`template ${type} files as purpose ${purpose}`);
	const stem = basename(o.source).replace(/\.json$/i, "").toLowerCase();
	const downloads = o.downloads ?? join(homedir(), "Downloads");
	const out = join(downloads, `${stem}.html`);
	renderTemplate({ type, input: o.source, out, env });
	const brandCss = o.style === "formal" ? formalCss(o.source, env) : undefined;
	const inlineBrand = o.brand ? resolveBrandCss({ style: o.style, ...o.brand.ctx }, o.brand.cfg) : "";
	const at = o.now ?? new Date().toISOString();
	const clean = (text: string) => redactPrivate(text, env).replace(/\n$/, "");
	const provenance: ProvenanceRecipe | undefined = o.prompt
		? {
				prompt: clean(o.prompt),
				params: { purpose, style: o.style ?? "house", template: type, ...o.params },
				sources: (o.sources ?? [basename(o.source)]).map((ref) => ({ ref: clean(ref), at: at.slice(0, 10) })),
				generatedAt: at,
				audience: o.audience,
				contract: [`python3 doc-render/templates/template.py ${type} ${basename(o.source)} ${stem}.html`],
			}
		: undefined;
	let page = readFileSync(out, "utf8");
	const summary = o.summary ?? pageLede(page);
	if (o.nav) page = injectStyle(page, navCss(), "doc-nav-css");
	if (brandCss) page = injectStyle(page, readFileSync(brandCss, "utf8"), "doc-brand-css");
	if (inlineBrand) page = injectStyle(page, inlineBrand, "doc-brand-css");
	if (provenance) page = embedProvenance(page, provenance, { homes: [homedir(), ...TEMP_ROOTS()] });
	writeFileSync(out, page);
	try {
		checkPage(out, env); // the finished page is the authority: nav, brand and provenance are all in it now
	} catch (e) {
		rmSync(out, { force: true });
		throw e;
	}
	const filed = fileDoc({ html: out, kind: KIND[purpose], source: o.source, summary, tags: o.tags }, env);
	return { rendered: [out], filed: [filed], urls: urlsFor(filed).map((u) => u.url), findings: [], brandCss, provenance };
}

export function publishDoc(o: PublishOptions, env: Env = process.env): PublishResult {
	if (!existsSync(o.source)) throw new Error(`no such source: ${o.source}`);
	if (o.template) return publishTemplate(o, o.template, env);
	const purpose = o.purpose ?? "report";
	const kind = KIND[purpose] ?? "report";
	const stem = basename(o.source).replace(/\.md$/i, "").toLowerCase();
	const downloads = o.downloads ?? join(homedir(), "Downloads");
	const brandCss = o.style === "formal" ? formalCss(o.source, env) : undefined;
	const md = readFileSync(o.source, "utf8");
	const findings = lintDoc(md, purpose);
	const inlineBrand = o.brand ? resolveBrandCss({ style: o.style, ...o.brand.ctx }, o.brand.cfg) : "";
	const provenance: ProvenanceRecipe | undefined = o.prompt
		? {
				prompt: o.prompt,
				params: { purpose, style: o.style ?? "house", ...o.params },
				sources: (o.sources ?? [basename(o.source)]).map((ref) => ({ ref, at: (o.now ?? new Date().toISOString()).slice(0, 10) })),
				generatedAt: o.now ?? new Date().toISOString(),
				audience: o.audience,
				contract: [`python3 doc-render/build.py ${basename(o.source)} -m doc -o ${stem}.html`],
			}
		: undefined;

	// One page for reading and presenting: a deck is the same page opening in present mode.
	const modes: ("doc" | "deck")[] = [purpose === "deck" ? "deck" : "doc"];
	const rendered: string[] = [];
	const filed: string[] = [];
	for (const mode of modes) {
		const out = join(downloads, `${stem}.html`);
		const args = [BUILD, o.source, "-m", mode, "-o", out];
		if (o.eyebrow) args.push("-e", o.eyebrow);
		if (brandCss) args.push("--brand-css", brandCss);
		try {
			execFileSync("python3", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
		} catch (e) {
			throw new Error(`render failed (${mode}): ${(e as { stderr?: string }).stderr?.trim() || (e as Error).message}`);
		}
		if (o.nav || inlineBrand || provenance) {
			let page = readFileSync(out, "utf8");
			if (o.nav) page = injectStyle(page, navCss(), "doc-nav-css");
			if (inlineBrand) page = injectStyle(page, inlineBrand, "doc-brand-css");
			if (provenance) page = embedProvenance(page, provenance, { homes: [homedir()] });
			writeFileSync(out, page);
		}
		rendered.push(out);
		const fileKind = kind;
		filed.push(fileDoc({ html: out, kind: fileKind, source: o.source, summary: o.summary, tags: o.tags }, env));
	}
	const urls = filed.flatMap((f) => urlsFor(f).map((u) => u.url));
	return { rendered, filed, urls, findings, brandCss, provenance };
}
