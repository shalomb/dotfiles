/**
 * Subcommand trees for grouped slash commands (`/git since HEAD~3`), plus a tiny
 * shared-command registry so a group command reuses existing handlers instead of
 * copying them. Pure apart from a module-global map on globalThis. Tested in
 * subcommands.test.ts.
 *
 * pi passes getArgumentCompletions the whole text after `/cmd `, and the chosen
 * item's value replaces all of it — so nested suggestions keep the subcommand in
 * their value ("since reset") and show only the last word as the label.
 */

export interface Item { value: string; label: string; description?: string }
type Awaitable<T> = T | Promise<T>;
export type Handler = (args: string, ctx: any) => Awaitable<unknown>;
export interface Sub {
	description: string;
	handler: Handler;
	complete?: (prefix: string) => Awaitable<Item[] | null | undefined>;
}
export type SubTree = Record<string, Sub>;

export async function complete(tree: SubTree, text: string): Promise<Item[] | null> {
	const m = /^(\S*)(\s+)?([\s\S]*)$/.exec(text.trimStart())!;
	const [, head, sep, rest] = m;
	if (!sep) {
		const items = Object.entries(tree)
			.filter(([name]) => name.startsWith(head))
			.map(([name, sub]) => ({ value: name, label: name, description: sub.description }));
		return items.length ? items : null;
	}
	const sub = tree[head];
	if (!sub?.complete) return null;
	const inner = await sub.complete(rest);
	if (!inner?.length) return null;
	return inner.map((i) => ({ ...i, value: `${head} ${i.value}` }));
}

export async function dispatch(tree: SubTree, args: string, ctx: any, fallback?: Handler): Promise<unknown> {
	const m = /^(\S*)\s*([\s\S]*)$/.exec(args.trim())!;
	const [, head, rest] = m;
	const sub = head ? tree[head] : undefined;
	if (sub) return sub.handler(rest, ctx);
	return fallback?.(args.trim(), ctx);
}

// --- shared-command registry (lookup at call time, so extension load order is irrelevant) ---
type Spec = { description: string; handler: Handler; getArgumentCompletions?: (p: string) => any };
const KEY = Symbol.for("pi.extensions.sharedCommands");
const store = (): Map<string, Spec> => ((globalThis as any)[KEY] ??= new Map());

/** Register with pi as usual and publish the spec for group commands like /git. */
export function registerShared(pi: { registerCommand: (name: string, spec: any) => void }, name: string, spec: Spec): void {
	pi.registerCommand(name, spec);
	store().set(name, spec);
}
export const sharedCommand = (name: string): Spec | undefined => store().get(name);
export const resetShared = (): void => store().clear();

/** Build a Sub that forwards to a shared command; undefined if that extension isn't loaded. */
export function fromShared(name: string): Sub | undefined {
	const s = sharedCommand(name);
	if (!s) return undefined;
	return { description: s.description, handler: s.handler, complete: s.getArgumentCompletions };
}
