import { expect, test } from "bun:test";
import { tmuxRenameArgs } from "../tmux-name-sync";

test("renames pane title and window", () => {
	expect(tmuxRenameArgs("%1", "foo")).toEqual([
		["select-pane", "-t", "%1", "-T", "foo"],
		["rename-window", "-t", "%1", "foo"],
	]);
});
test("cleared name is a no-op", () => expect(tmuxRenameArgs("%1", undefined)).toEqual([]));
