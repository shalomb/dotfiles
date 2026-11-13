// Run: bun test .pi/agent/extensions/_lib/locate-command.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import registerLocate from "../locate-command.ts";

const ENV_KEYS = ["TMUX", "TMUX_PANE", "PI_SUBAGENT", "PI_BG_TASK", "PI_FUSION", "PI_CHILD"];
type Popup = { code: number; stderr?: string; choose?: string[] };

let repo: string;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
	savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
	for (const k of ENV_KEYS) delete process.env[k];
	repo = realpathSync(mkdtempSync(join(tmpdir(), "locate-cmd-")));
	spawnSync("git", ["init", "-q"], { cwd: repo });
	writeFileSync(join(repo, "zqneedlewidget.txt"), "hello\n");
	spawnSync("git", ["add", "."], { cwd: repo });
});

afterEach(() => {
	for (const k of ENV_KEYS) savedEnv[k] === undefined ? delete process.env[k] : (process.env[k] = savedEnv[k]);
	rmSync(repo, { recursive: true, force: true });
});

/** Registers the extension on a fake pi and returns the /locate handler. */
function setup(opts: { visible?: string; popup?: Popup } = {}) {
	const commands: Record<string, any> = {};
	const execCalls: string[][] = [];
	const pi = {
		registerCommand: (name: string, def: any) => (commands[name] = def),
		exec: async (_cmd: string, args: string[]) => {
			execCalls.push(args);
			if (args[0] === "display-message" && args.includes("-t") && args.at(-1)!.includes("session_attached"))
				return { code: 0, stdout: opts.visible ?? "1|1|1", stderr: "" };
			if (args[0] === "display-message") return { code: 0, stdout: "sess:0.0\n", stderr: "" };
			if (args[0] === "display-popup") {
				const popup = opts.popup ?? { code: 0 };
				const i = args.indexOf("locate-picker");
				const out = args[i + 2];
				if (popup.choose?.length) writeFileSync(out, `${popup.choose.join("\n")}\n`);
				return { code: popup.code, stdout: "", stderr: popup.stderr ?? "" };
			}
			return { code: 0, stdout: "", stderr: "" };
		},
	};
	registerLocate(pi as any);

	const notices: { msg: string; level?: string }[] = [];
	const outputs: string[] = [];
	const editor = { text: "" as string | undefined, set: [] as string[] };
	const makeCtx = (withOutput: boolean, withEditor = true) => ({
		cwd: repo,
		hasUI: true,
		ui: {
			notify: (msg: string, level?: string) => notices.push({ msg, level }),
			...(withOutput ? { output: (t: string) => outputs.push(t) } : {}),
			...(withEditor ? { getEditorText: () => editor.text } : {}),
			setEditorText: (t: string) => {
				editor.set.push(t);
				editor.text = t;
			},
		},
	});
	const inTmux = () => {
		process.env.TMUX = "/tmp/tmux-0/default,1,0";
		process.env.TMUX_PANE = "%1";
	};
	return { command: commands.locate, execCalls, notices, outputs, editor, makeCtx, inTmux };
}

describe("/locate handler", () => {
	it("registers the locate command", () => {
		const t = setup();
		expect(typeof t.command.handler).toBe("function");
		expect(t.command.getArgumentCompletions("--l")).toEqual([{ value: "--list", label: "--list" }]);
		expect(t.command.getArgumentCompletions("x")).toBeNull();
	});

	describe("receipt paths", () => {
		it("--list sends the receipt through ui.output", async () => {
			const t = setup();
			t.inTmux();
			await t.command.handler("--list zqneedlewidget", t.makeCtx(true));
			expect(t.outputs).toHaveLength(1);
			expect(t.outputs[0]).toContain("zqneedlewidget.txt");
			expect(t.notices).toEqual([]);
			expect(t.execCalls).toEqual([]);
		});

		it("--list falls back to notify when ui.output is absent", async () => {
			const t = setup();
			t.inTmux();
			await t.command.handler("-l zqneedlewidget", t.makeCtx(false));
			expect(t.notices).toHaveLength(1);
			expect(t.notices[0].msg).toContain("zqneedlewidget.txt");
		});

		it("outside tmux falls back to the receipt without opening a popup", async () => {
			const t = setup();
			delete process.env.TMUX;
			await t.command.handler("zqneedlewidget", t.makeCtx(true));
			expect(t.outputs[0]).toContain("zqneedlewidget.txt");
			expect(t.execCalls).toEqual([]);
			expect(t.editor.set).toEqual([]);
		});
	});

	describe("picker in tmux", () => {
		const chosen = () => join(repo, "zqneedlewidget.txt");

		it("appends @ref after existing editor text with one separating space", async () => {
			const t = setup({ popup: { code: 0, choose: [chosen()] } });
			t.inTmux();
			t.editor.text = "look at";
			await t.command.handler("zqneedlewidget", t.makeCtx(true));
			expect(t.editor.set).toEqual(["look at @zqneedlewidget.txt "]);
			expect(t.notices).toEqual([{ msg: "locate: added 1 path(s) to prompt", level: "info" }]);
			expect(t.execCalls.some((a) => a[0] === "display-popup")).toBe(true);
		});

		it("does not double the space when editor text already ends with one", async () => {
			const t = setup({ popup: { code: 0, choose: [chosen()] } });
			t.inTmux();
			t.editor.text = "look at ";
			await t.command.handler("zqneedlewidget", t.makeCtx(true));
			expect(t.editor.set).toEqual(["look at @zqneedlewidget.txt "]);
		});

		it("adds no leading space on an empty editor and counts multiple paths", async () => {
			const t = setup({ popup: { code: 0, choose: [chosen(), join(repo, "other file.txt")] } });
			t.inTmux();
			t.editor.text = "";
			await t.command.handler("zqneedlewidget", t.makeCtx(true));
			expect(t.editor.set).toEqual(['@zqneedlewidget.txt @"other file.txt" ']);
			expect(t.notices[0].msg).toBe("locate: added 2 path(s) to prompt");
		});

		it("treats a missing getEditorText as an empty editor", async () => {
			const t = setup({ popup: { code: 0, choose: [chosen()] } });
			t.inTmux();
			await t.command.handler("zqneedlewidget", t.makeCtx(true, false));
			expect(t.editor.set).toEqual(["@zqneedlewidget.txt "]);
		});

		it("notifies nothing selected when the out file is empty or missing", async () => {
			const t = setup({ popup: { code: 0 } });
			t.inTmux();
			await t.command.handler("zqneedlewidget", t.makeCtx(true));
			expect(t.notices).toEqual([{ msg: "locate: nothing selected", level: "info" }]);
			expect(t.editor.set).toEqual([]);
		});

		it("reports a nonzero popup exit with stderr", async () => {
			const t = setup({ popup: { code: 2, stderr: " boom \n" } });
			t.inTmux();
			await t.command.handler("zqneedlewidget", t.makeCtx(true));
			expect(t.notices).toEqual([{ msg: "locate popup failed (2): boom", level: "error" }]);
			expect(t.editor.set).toEqual([]);
		});

		it("hints at fzf when a nonzero exit has no stderr", async () => {
			const t = setup({ popup: { code: 127 } });
			t.inTmux();
			await t.command.handler("zqneedlewidget", t.makeCtx(true));
			expect(t.notices[0].level).toBe("error");
			expect(t.notices[0].msg).toContain("is fzf installed?");
		});

		it("explains when the popup is parked because the pane is not in view", async () => {
			const t = setup({ visible: "1|1|0" });
			t.inTmux();
			await t.command.handler("zqneedlewidget", t.makeCtx(true));
			expect(t.notices).toHaveLength(1);
			expect(t.notices[0].msg).toBe("locate: not shown, you are not looking at this pane (flagged @pi_attn)");
			expect(t.execCalls.some((a) => a[0] === "display-popup")).toBe(false);
			expect(t.editor.set).toEqual([]);
		});

		it("explains when the popup is skipped for a child process", async () => {
			const t = setup();
			t.inTmux();
			process.env.PI_SUBAGENT = "1";
			await t.command.handler("zqneedlewidget", t.makeCtx(true));
			expect(t.notices[0].msg).toBe("locate: not shown (child process or no tmux)");
		});
	});

	describe("early exits", () => {
		it("warns with usage on an empty query", async () => {
			const t = setup();
			t.inTmux();
			await t.command.handler("   ", t.makeCtx(true));
			expect(t.notices).toHaveLength(1);
			expect(t.notices[0].level).toBe("warning");
			expect(t.notices[0].msg).toStartWith("Usage: /locate");
			await t.command.handler("--list", t.makeCtx(true));
			expect(t.notices).toHaveLength(2);
			expect(t.outputs).toEqual([]);
		});

		it("notifies no matches in tmux without opening a popup", async () => {
			const t = setup({ popup: { code: 0, choose: [join(repo, "zqneedlewidget.txt")] } });
			t.inTmux();
			await t.command.handler("zzqqxxnomatchzz", t.makeCtx(true));
			expect(t.notices).toEqual([{ msg: 'locate: no matches for "zzqqxxnomatchzz"', level: "info" }]);
			expect(t.execCalls).toEqual([]);
			expect(t.editor.set).toEqual([]);
		});
	});
});
