// Verify registry works under Node (not just Bun)
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const transpiled = join(tmpdir(), `registry-transpiled-${Date.now()}.js`);

describe("registry-node", () => {
	test("works under Node runtime with node:sqlite", () => {
		// Transpile registry.ts to plain JS that Node can load
		const build = spawnSync("bun", ["build", "--target=node", "./registry.ts", `--outfile=${transpiled}`], {
			encoding: "utf8",
			env: { ...process.env, NODE_NO_WARNINGS: "1" }
		});

		if (build.status !== 0) {
			console.error("Transpile STDERR:", build.stderr);
			throw new Error(`Transpile failed: ${build.stderr}`);
		}

		// Run test with Node to verify node:sqlite adapter works
		const testCode = `
import { openRegistry, registerInstance, search } from 'file://${transpiled}';
const db = openRegistry(':memory:');
registerInstance(db, {
	sessionId: 'test-123',
	file: '/tmp/test.jsonl',
	cwd: '/tmp/foo',
	pid: 12345,
	started: '2026-01-01T00:00:00.000Z'
});
const rows = search(db, { id: 'test-123' });
console.log(JSON.stringify(rows));
`;

		const result = spawnSync("node", ["--input-type=module", "-e", testCode], {
			encoding: "utf8",
			env: { ...process.env, NODE_NO_WARNINGS: "1" }
		});

		if (result.status !== 0) {
			console.error("Node STDOUT:", result.stdout);
			console.error("Node STDERR:", result.stderr);
		}

		expect(result.status).toBe(0);
		const rows = JSON.parse(result.stdout.trim());
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe("test-123");
		expect(rows[0].cwd).toBe("/tmp/foo");
		expect(rows[0].status).toBe("running");

		// Cleanup
		try {
			unlinkSync(transpiled);
		} catch {
			// Ignore cleanup errors
		}
	});
});
