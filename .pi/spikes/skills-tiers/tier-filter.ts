// @ts-nocheck — throwaway spike run via `pi -e`; no tsconfig/node_modules here, so the LSP cannot resolve pi/node types.
/**
 * SPIKE: filter the skills catalog in before_agent_start. Throwaway; load with `pi -e`.
 *   SPIKE_MODE=off        no filtering (baseline)
 *   SPIKE_MODE=none       drop every skill
 *   SPIKE_MODE=allow      keep only names in SPIKE_KEEP (comma separated)
 * Appends one JSON line per run to $SPIKE_LOG.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendFileSync } from "node:fs";

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (e: any) => {
		const mode = process.env.SPIKE_MODE ?? "off";
		const keep = new Set((process.env.SPIKE_KEEP ?? "").split(",").filter(Boolean));
		const opts = e.systemPromptOptions;
		const before: any[] = opts.skills ?? [];
		if (mode === "none") opts.skills = [];
		else if (mode === "allow") opts.skills = before.filter((s) => keep.has(s.name));
		const after: any[] = opts.skills ?? [];
		if (process.env.SPIKE_LOG)
			appendFileSync(
				process.env.SPIKE_LOG,
				JSON.stringify({
					mode,
					before: before.length,
					after: after.length,
					promptCharsBeforeMutation: e.systemPrompt.length,
					kept: after.map((s) => s.name),
					sources: [...new Set(before.map((s) => s.sourceInfo?.source ?? s.sourceInfo?.path ?? "?"))],
				}) + "\n",
			);
	});
}
