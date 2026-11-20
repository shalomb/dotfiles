// Run: bun test doc-ranking.test.ts
import { describe, expect, it } from "bun:test";
import { habitScore, rankDocs, type RankDoc } from "./doc-ranking.ts";

const at = (d: string) => Date.parse(d); // UTC timestamps
const NOW = at("2024-05-10T09:30:00Z"); // Friday

describe("habitScore", () => {
  it("no accesses = 0", () => expect(habitScore([], NOW)).toBe(0));
  it("same weekday+time beats same time other day", () => {
    const same = habitScore([at("2024-05-03T09:31:00Z")], NOW);
    const other = habitScore([at("2024-05-02T09:31:00Z")], NOW);
    expect(same).toBeGreaterThan(other);
    expect(other).toBeGreaterThan(0);
  });
  it("far time of day = 0", () => expect(habitScore([at("2024-05-03T15:00:00Z")], NOW)).toBe(0));
  it("wraps midnight", () => expect(habitScore([at("2024-05-09T23:50:00Z")], at("2024-05-10T00:05:00Z"))).toBeGreaterThan(0));
  it("future accesses ignored", () => expect(habitScore([NOW + 1000], NOW)).toBe(0));
});

describe("rankDocs", () => {
  const docs: RankDoc[] = [
    { id: "a", match: 1 },
    { id: "b", match: 1, accesses: [at("2024-05-03T09:30:00Z"), at("2024-04-26T09:30:00Z")] },
    { id: "c", match: 1, living: true, status: "active" },
  ];
  it("habit and active status bubble above plain", () => {
    const r = rankDocs(docs, NOW).map((x) => x.id);
    expect(r.indexOf("a")).toBe(2);
  });
  it("match dominates", () => {
    const r = rankDocs([{ id: "x", match: 5 }, ...docs], NOW);
    expect(r[0].id).toBe("x");
  });
  it("deterministic, ties by id, no mutation", () => {
    const d: RankDoc[] = [{ id: "z", match: 1 }, { id: "y", match: 1 }];
    expect(rankDocs(d, NOW).map((x) => x.id)).toEqual(["y", "z"]);
    expect(d[0].id).toBe("z");
  });
  it("stale/archived living docs do not bubble", () => {
    const r = rankDocs([{ id: "p", match: 1 }, { id: "q", match: 1, living: true, status: "archived" }], NOW);
    expect(r.map((x) => x.id)).toEqual(["p", "q"]);
  });
});
