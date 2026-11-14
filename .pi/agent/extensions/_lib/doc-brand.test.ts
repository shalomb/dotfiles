import { describe, expect, it } from "bun:test";
import { brandCss, isCorporateContext, resolveBrand } from "./doc-brand.ts";

const corp = { domains: ["corp.example.com"] };
describe("isCorporateContext", () => {
  it("matches domain and subdomain", () => {
    expect(isCorporateContext({ host: "corp.example.com" }, corp)).toBe(true);
    expect(isCorporateContext({ host: "git.corp.example.com" }, corp)).toBe(true);
  });
  it("rejects lookalikes, personal and empty", () => {
    expect(isCorporateContext({ host: "evilcorp.example.com" }, corp)).toBe(false);
    expect(isCorporateContext({ host: "github.com" }, corp)).toBe(false);
    expect(isCorporateContext({}, corp)).toBe(false);
    expect(isCorporateContext({ host: "corp.example.com" }, { domains: [] })).toBe(false);
  });
});
describe("brandCss isolation", () => {
  const css = ".x{color:red}";
  it("emits only for corporate + formal", () => {
    expect(brandCss({ host: "corp.example.com", style: "formal" }, { ...corp, css })).toBe(css);
  });
  it("never emits otherwise", () => {
    expect(brandCss({ host: "github.com", style: "formal" }, { ...corp, css })).toBe("");
    expect(brandCss({ host: "corp.example.com", style: "plain" }, { ...corp, css })).toBe("");
    expect(brandCss({ host: "corp.example.com", style: "formal", oss: true }, { ...corp, css })).toBe("");
  });
  it("resolveBrand reports", () => {
    expect(resolveBrand({ host: "github.com", style: "formal" }, { ...corp, css }).brand).toBe("neutral");
  });
});
