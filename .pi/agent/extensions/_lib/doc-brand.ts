// Pure brand/CSS isolation: corporate CSS only in corporate context.
export interface BrandContext { host?: string; style?: string; oss?: boolean; personal?: boolean }
export interface BrandConfig { domains: string[]; css?: string }

export function isCorporateContext(ctx: BrandContext, cfg: BrandConfig): boolean {
  if (ctx.oss || ctx.personal) return false;
  const h = (ctx.host ?? "").toLowerCase().trim();
  if (!h) return false;
  return cfg.domains.some((d) => {
    const dd = d.toLowerCase().trim();
    return dd !== "" && (h === dd || h.endsWith("." + dd));
  });
}

export function resolveBrand(ctx: BrandContext, cfg: BrandConfig): { brand: "corporate" | "neutral"; css: string } {
  if (ctx.style === "formal" && isCorporateContext(ctx, cfg)) return { brand: "corporate", css: cfg.css ?? "" };
  return { brand: "neutral", css: "" };
}

export const brandCss = (ctx: BrandContext, cfg: BrandConfig): string => resolveBrand(ctx, cfg).css;
