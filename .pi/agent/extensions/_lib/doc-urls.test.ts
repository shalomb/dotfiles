// Run: bun test doc-urls.test.ts
// Port of serve-artefacts urls.py + publish.endpoints (the parts /doc needs).
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildUrls, relUnderRoot, systemEndpoint, userEndpoints } from "./doc-urls.ts";

let tmp: string;
beforeEach(() => {
	tmp = mkdtempSync(join(tmpdir(), "doc-urls-"));
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("relUnderRoot", () => {
	it("gives the served path for a file under the root", () => {
		mkdirSync(join(tmp, "docs/report/x"), { recursive: true });
		writeFileSync(join(tmp, "docs/report/x/index.html"), "");
		expect(relUnderRoot(join(tmp, "docs/report/x/index.html"), tmp)).toBe("docs/report/x/index.html");
		expect(relUnderRoot(join(tmp, "docs"), tmp)).toBe("docs/");
	});
	it("refuses missing, outside, dot and symlinked paths", () => {
		mkdirSync(join(tmp, ".hid"));
		writeFileSync(join(tmp, ".hid/a"), "");
		writeFileSync(join(tmp, "real"), "");
		symlinkSync(join(tmp, "real"), join(tmp, "link"));
		expect(relUnderRoot(join(tmp, "nope"), tmp)).toBeNull();
		expect(relUnderRoot("/etc/hosts", tmp)).toBeNull();
		expect(relUnderRoot(join(tmp, ".hid/a"), tmp)).toBeNull();
		expect(relUnderRoot(join(tmp, "link"), tmp)).toBeNull();
		expect(relUnderRoot(tmp, tmp)).toBeNull();
	});
});

describe("buildUrls", () => {
	it("drops port 80 and brackets IPv6", () => {
		expect(buildUrls("docs/", [{ net: "url", host: "idun", port: "80" }])).toEqual([{ net: "url", url: "http://idun/r/docs/" }]);
		expect(buildUrls("d", [{ net: "ts", host: "fd7a::1", port: "8080" }])[0].url).toBe("http://[fd7a::1]:8080/r/d");
	});
});

describe("endpoints", () => {
	it("reads the system nginx when it serves /r/ and answers", () => {
		const conf = join(tmp, "sys.conf");
		writeFileSync(conf, "server {\n  listen 80 default_server;\n  location /r/ { }\n}\n");
		expect(systemEndpoint(conf, "idun", () => true)).toEqual([{ net: "url", host: "idun", port: "80" }]);
		expect(systemEndpoint(conf, "idun", () => false)).toEqual([]);
		expect(systemEndpoint(join(tmp, "missing"), "idun", () => true)).toEqual([]);
	});
	it("falls back to the per-network user instances", () => {
		const d = join(tmp, "agent-skills/understand-server/tailnet");
		mkdirSync(d, { recursive: true });
		writeFileSync(join(d, "nginx.conf"), "listen 100.1.2.3:8088;\nlocation /r/ {}\n");
		expect(userEndpoints(tmp)).toEqual([{ net: "tailnet", host: "100.1.2.3", port: "8088" }]);
	});
});
