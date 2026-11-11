import { describe, expect, test, beforeEach } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openRegistry, search } from "./registry";

let tempStateDir: string;
let db: ReturnType<typeof openRegistry>;
let handlers: Map<string, (e: any, ctx: any) => Promise<void>>;

beforeEach(() => {
	// Create temp dir for XDG_STATE_HOME (registry DB must NOT be in repo)
	tempStateDir = mkdtempSync(join(tmpdir(), "reg-ext-"));
	process.env.XDG_STATE_HOME = tempStateDir;
	
	// Fresh handlers map
	handlers = new Map();
});

describe("session-registry extension", () => {
	test("session lifecycle: start → turn_end → shutdown", async () => {
		// Import extension AFTER setting XDG_STATE_HOME so defaultDbPath() uses temp dir
		const sessionRegistryExtension = (await import("../session-registry")).default;
		
		// Fake pi extension API that records event handlers
		const fakePi = {
			on(name: string, handler: (e: any, ctx: any) => Promise<void>) {
				handlers.set(name, handler);
			}
		};
		
		// Initialize extension
		sessionRegistryExtension(fakePi as any);
		
		// Verify handlers registered
		expect(handlers.has("session_start")).toBe(true);
		expect(handlers.has("turn_end")).toBe(true);
		expect(handlers.has("session_shutdown")).toBe(true);
		
		// Fake context with sessionManager that has getSessionFile()
		const sessionId = "test-session-uuid-12345";
		const sessionFile = "/x/y_test-session-uuid-12345.jsonl";
		const cwd = mkdtempSync(join(tmpdir(), "session-cwd-"));
		
		const fakeCtx = {
			cwd,
			sessionManager: {
				getSessionId: () => sessionId,
				getSessionFile: () => sessionFile  // The fix: was getSessionMetadataPath (nonexistent)
			},
			profile: { name: "test-profile" }
		};
		
		// 1. Trigger session_start
		await handlers.get("session_start")!({}, fakeCtx);
		
		// Open same DB and verify session registered with correct file path
		db = openRegistry(join(tempStateDir, "pi-registry/registry.db"));
		let rows = search(db, { id: sessionId });
		expect(rows).toHaveLength(1);
		expect(rows[0].file).toBe(sessionFile);
		expect(rows[0].status).toBe("running");
		expect(rows[0].cwd).toBe(cwd);
		
		// Verify instance has current pid
		const inst = db.query("SELECT pid FROM instances WHERE session_id=?").get(sessionId) as any;
		expect(inst.pid).toBe(process.pid);
		
		// 2. Trigger turn_end (updates last_activity)
		const beforeTurnEnd = new Date().toISOString();
		await new Promise(resolve => setTimeout(resolve, 10)); // Ensure timestamp advances
		await handlers.get("turn_end")!({}, fakeCtx);
		
		rows = search(db, { id: sessionId });
		expect(rows[0].last_activity).not.toBeNull();
		expect(rows[0].last_activity! >= beforeTurnEnd).toBe(true);
		
		// 3. Trigger session_shutdown (closes instance, sets status ended)
		await handlers.get("session_shutdown")!({}, fakeCtx);
		
		rows = search(db, { id: sessionId });
		expect(rows).toHaveLength(1);
		expect(rows[0].status).toBe("ended");
		expect(rows[0].ended).not.toBeNull();
		
		// Verify instance ended timestamp set
		const closedInst = db.query("SELECT ended FROM instances WHERE session_id=? AND pid=?").get(sessionId, process.pid) as any;
		expect(closedInst.ended).not.toBeNull();
	});
	
	test("session_start without getSessionFile() uses empty string", async () => {
		// Import extension AFTER setting XDG_STATE_HOME
		const sessionRegistryExtension = (await import("../session-registry")).default;
		
		const fakePi = {
			on(name: string, handler: (e: any, ctx: any) => Promise<void>) {
				handlers.set(name, handler);
			}
		};
		
		sessionRegistryExtension(fakePi as any);
		
		const sessionId = "test-session-no-file";
		const cwd = mkdtempSync(join(tmpdir(), "session-cwd-"));
		
		// sessionManager without getSessionFile() method (old API)
		const fakeCtx = {
			cwd,
			sessionManager: {
				getSessionId: () => sessionId
				// NO getSessionFile method
			}
		};
		
		await handlers.get("session_start")!({}, fakeCtx);
		
		db = openRegistry(join(tempStateDir, "pi-registry/registry.db"));
		const rows = search(db, { id: sessionId });
		expect(rows).toHaveLength(1);
		expect(rows[0].file).toBe("");  // Empty string when getSessionFile not available
	});
});
