/**
 * /locate <path terms> [in|within|containing <content terms>]
 *
 * Zone-weighted file discovery (git ls-files + plocate) returning a <=25-line pointer receipt.
 * Spec: .pi/docs/specs/locate-command/spec.md
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { runLocate } from "./_lib/locate.ts";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("locate", {
		description: "Locate files by natural-language query across cwd, repo, siblings and the indexed filesystem",
		handler: async (args: string, ctx: any) => {
			if (!args.trim()) {
				ctx.ui.notify("Usage: /locate <path terms> [in|within|containing <content terms>]", "warning");
				return;
			}
			const receipt = await runLocate(args, { cwd: ctx.cwd });
			if (typeof ctx.ui?.output === "function") ctx.ui.output(receipt);
			else ctx.ui?.notify?.(receipt, "info");
		},
	});
}
