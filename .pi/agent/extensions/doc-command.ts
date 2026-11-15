/**
 * /doc — write, render, check and file documents.
 *
 * The engine lives here (_lib/doc-*.ts, _lib/doc-render/); the docs-authoring
 * skill holds only the writing rules and skeletons.
 *
 *   /doc                         infer purpose + topic from the session
 *   /doc decision|report|status|workshop|deck|brief [topic] [for <who>] [1-pager|6-pager|20-pager] [formal]
 *   /doc epicmap|readout|decision <input.json> [formal]   publish a structured input directly (no model)
 *   /doc epicmap|readout [topic] | decision template [topic]   the model writes the input, then publishes it
 *   /doc deeper | shorter | for <who> | formal     revise the last document
 *   /doc find <words> | list [purpose] | file <html> | open | index
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildDocPrompt, parseDocArgs, PURPOSES } from "./_lib/doc-intent.ts";
import { docRoot, fileDoc, findDocs, listDocs, showDoc, writeIndex } from "./_lib/doc-library.ts";
import { publishDoc } from "./_lib/doc-publish.ts";
import { isTemplateType, TEMPLATE_TYPES, TEMPLATES, templateExample } from "./_lib/doc-templates.ts";
import { urlsFor } from "./_lib/doc-urls.ts";

const link = (path: string) => urlsFor(path).map((u) => u.url)[0] ?? path;

function brandLine(css: string | undefined, style?: string): string {
	if (css) return `brand     ${css}`;
	return style === "formal" ? "brand     none found (house style used)" : "";
}

const TemplateParams = Type.Object({
	type: Type.Union(TEMPLATE_TYPES.map((t) => Type.Literal(t)), { description: "epicmap | readout | decision" }),
});

/** The lines every publish reports, from the tool and from `/doc <type> <input.json>`. */
function publishLines(r: ReturnType<typeof publishDoc>, style?: string): string[] {
	return [
		...r.rendered.map((p) => `rendered  ${p}`),
		...r.filed.map((p) => `filed     ${p}`),
		...r.urls.map((u) => `url       ${u}`),
		`library   ${link(join(docRoot(), "index.html"))}`,
		brandLine(r.brandCss, style),
		r.findings.length ? `\nFindings (${r.findings.length}):` : "\nChecks: clean",
		...r.findings.map((f) => `  - [${f.code}] ${f.message}`),
	].filter(Boolean);
}

const Params = Type.Object({
	source: Type.String({ description: "Path to the Markdown source to publish (with template: the JSON input file)" }),
	template: Type.Optional(Type.Union(TEMPLATE_TYPES.map((t) => Type.Literal(t)), { description: "epicmap | readout | decision: source is then a JSON input file; get a valid example with doc_template" })),
	purpose: Type.Optional(Type.Union(PURPOSES.map((p) => Type.Literal(p)), { description: "decision | report | status | workshop | deck | brief (deck = same page, opens in present mode; brief = concept brief)" })),
	style: Type.Optional(Type.Union([Type.Literal("house"), Type.Literal("formal")], { description: "formal applies the brand stylesheet" })),
	tags: Type.Optional(Type.Array(Type.String())),
	eyebrow: Type.Optional(Type.String({ description: "small caps line above the title, e.g. '<team> · Draft'" })),
	summary: Type.Optional(Type.String({ description: "library card summary; defaults to the one-sentence ask" })),
	prompt: Type.Optional(Type.String({ description: "the request that produced this document; embeds a folded, sanitised provenance recipe in the page" })),
	nav: Type.Optional(Type.Boolean({ description: "inject the adaptive navigation stylesheet" })),
});

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "doc_publish",
		label: "Publish document",
		description:
			"Render a Markdown document to self-contained HTML (purpose=deck: the same page, opening in present mode; every page can present with P), check it against the docs-authoring rules, copy it to ~/Downloads, file it in the document library and return its URLs. Findings are warnings; fix what you can and publish again (old renders are kept). With template (epicmap, readout or decision) source is a structured JSON input file instead of Markdown (see doc_template).",
		promptSnippet: "Render, check, file and link a /doc Markdown document in one call",
		parameters: Params,
		async execute(_id, params: any) {
			try {
				const r = publishDoc(params);
				const lines = publishLines(r, params.style);
				return { content: [{ type: "text" as const, text: lines.join("\n") }], details: r };
			} catch (e) {
				const msg = (e as Error).message;
				return { content: [{ type: "text" as const, text: `Error: ${msg}` }], details: { error: msg } };
			}
		},
	});

	pi.registerTool({
		name: "doc_template",
		label: "Doc template example",
		description: "For a /doc template type (epicmap, readout, decision): the purpose it files as, a valid example input to copy and the pointer to its rules. Read-only.",
		promptSnippet: "Get the input schema example for a /doc template (epicmap, readout, decision)",
		parameters: TemplateParams,
		async execute(_id, params: any) {
			try {
				if (!isTemplateType(params.type)) throw new Error(`unknown template type: ${params.type}`);
				const text = [
					`template  ${params.type}: ${TEMPLATES[params.type].label}`,
					`files as  ${TEMPLATES[params.type].purpose}`,
					"rules: docs/specs/doc-system/templates.md",
					"example input (JSON; never add brand, theme, css or colour keys):",
					templateExample(params.type).trimEnd(),
				].join("\n");
				return { content: [{ type: "text" as const, text }], details: { type: params.type, purpose: TEMPLATES[params.type].purpose } };
			} catch (e) {
				const msg = (e as Error).message;
				return { content: [{ type: "text" as const, text: `Error: ${msg}` }], details: { error: msg } };
			}
		},
	});

	pi.registerCommand("doc", {
		description: "Write a decision, report, status, workshop pack, deck or concept brief from this session; publish an epicmap, readout or decision from a JSON input; or find/list/file/open documents",
		handler: async (args, ctx) => {
			const intent = parseDocArgs(args);
			const say = (text: string) => ctx.ui.notify(text, "info");

			switch (intent.action) {
				case "find":
				case "list": {
					const docs = intent.action === "find" ? findDocs(intent.topic.split(/\s+/).filter(Boolean)) : listDocs({ kind: intent.purpose });
					say(docs.length ? docs.slice(0, 30).map((d) => `${showDoc(d)}\n    ${link(join(docRoot(), d.path))}`).join("\n") : "No documents found.");
					return;
				}
				case "index":
					say(`Rebuilt ${link(writeIndex())}`);
					return;
				case "open": {
					const page = join(docRoot(), "index.html");
					if (!existsSync(page)) writeIndex();
					say(`Documents: ${link(page)}`);
					return;
				}
				case "file": {
					const path = intent.topic.replace(/^~(?=\/)/, process.env.HOME ?? "~");
					try {
						const filed = fileDoc({ html: path });
						say(`Filed ${filed}\n${link(filed)}`);
					} catch (e) {
						ctx.ui.notify(`/doc file: ${(e as Error).message}`, "error");
					}
					return;
				}
			}

			if (intent.template) {
				const input = intent.topic.replace(/^~(?=\/)/, process.env.HOME ?? "~");
				if (input.toLowerCase().endsWith(".json") && existsSync(input)) {
					try {
						const r = publishDoc({ source: input, template: intent.template, style: intent.style });
						say(publishLines(r, intent.style).join("\n"));
					} catch (e) {
						ctx.ui.notify((e as Error).message, "error");
					}
					return;
				}
			}

			const message = buildDocPrompt(intent);
			if (ctx.isIdle()) {
				pi.sendUserMessage(message);
				return;
			}
			pi.sendUserMessage(message, { deliverAs: "followUp" });
			say("/doc queued as follow-up");
		},
	});
}

