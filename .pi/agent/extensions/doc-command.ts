/**
 * /doc — write, render, check and file documents.
 *
 * The engine lives here (_lib/doc-*.ts, _lib/doc-render/); the docs-authoring
 * skill holds only the writing rules and skeletons.
 *
 *   /doc                         infer purpose + topic from the session
 *   /doc decision|report|status|workshop|deck [topic] [for <who>] [1-pager|6-pager|20-pager] [formal]
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
import { urlsFor } from "./_lib/doc-urls.ts";

const link = (path: string) => urlsFor(path).map((u) => u.url)[0] ?? path;

function brandLine(css: string | undefined, style?: string): string {
	if (css) return `brand     ${css}`;
	return style === "formal" ? "brand     none found (house style used)" : "";
}

const Params = Type.Object({
	source: Type.String({ description: "Path to the Markdown source to publish" }),
	purpose: Type.Optional(Type.Union(PURPOSES.map((p) => Type.Literal(p)), { description: "decision | report | status | workshop | deck (deck also renders slides)" })),
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
			"Render a Markdown document to self-contained HTML (and a slide deck for purpose=deck), check it against the docs-authoring rules, copy it to ~/Downloads, file it in the document library and return its URLs. Findings are warnings; fix what you can and publish again (old renders are kept).",
		promptSnippet: "Render, check, file and link a /doc Markdown document in one call",
		parameters: Params,
		async execute(_id, params: any) {
			try {
				const r = publishDoc(params);
				const lines = [
					...r.rendered.map((p) => `rendered  ${p}`),
					...r.filed.map((p) => `filed     ${p}`),
					...r.urls.map((u) => `url       ${u}`),
					`library   ${link(join(docRoot(), "index.html"))}`,
					brandLine(r.brandCss, params.style),
					r.findings.length ? `\nFindings (${r.findings.length}):` : "\nChecks: clean",
					...r.findings.map((f) => `  - [${f.code}] ${f.message}`),
				].filter(Boolean);
				return { content: [{ type: "text" as const, text: lines.join("\n") }], details: r };
			} catch (e) {
				const msg = (e as Error).message;
				return { content: [{ type: "text" as const, text: `Error: ${msg}` }], details: { error: msg } };
			}
		},
	});

	pi.registerCommand("doc", {
		description: "Write a decision, report, status, workshop pack or deck from this session; or find/list/file/open documents",
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

