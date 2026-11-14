import { describe, expect, it } from "bun:test";
import { renderDashboard, summarize } from "./doc-dashboard.ts";

const input = {
  title: "Epic <A>",
  items: [
    { key: "A-1", title: "one", status: "done" as const },
    { key: "A-2", title: "two", status: "in-progress" as const },
    { key: "A-3", title: "three", status: "blocked" as const, blockedBy: ["A-2"] },
    { key: "A-4", title: "four", status: "todo" as const },
  ],
};
describe("summarize", () => {
  it("counts, percent, health", () => {
    const s = summarize(input.items);
    expect(s.total).toBe(4);
    expect(s.counts.done).toBe(1);
    expect(s.wip).toBe(1);
    expect(s.percentDone).toBe(25);
    expect(s.health).toBe("at-risk");
    expect(s.blockers).toEqual(["A-3"]);
  });
  it("empty is on-track 0%", () => {
    const s = summarize([]);
    expect(s.percentDone).toBe(0);
    expect(s.health).toBe("on-track");
  });
});
describe("renderDashboard", () => {
  it("escapes and includes sections", () => {
    const h = renderDashboard(input);
    expect(h).toContain("Epic &lt;A&gt;");
    expect(h).not.toContain("<A>");
    expect(h).toContain("25%");
    expect(h).toContain("A-3");
    expect(h).not.toContain("http");
  });
});
