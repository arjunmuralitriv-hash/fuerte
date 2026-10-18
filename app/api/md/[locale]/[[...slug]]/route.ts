import { hasLocale } from "next-intl";

import { routing } from "@/i18n/routing";
import { getAllSlugs } from "@/lib/content";
import { markdownTwin } from "@/lib/content/llms";

// Served at /{locale}/{slug}.md through the rewrite in next.config.ts.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getAllSlugs().map((s) => ({ locale, slug: s.split("/").filter(Boolean) })));
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string; slug?: string[] }> }) {
  const { locale, slug } = await params;
  const body = hasLocale(routing.locales, locale) ? markdownTwin(locale, `/${(slug ?? []).join("/")}`) : undefined;
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8", "X-Robots-Tag": "noindex" } });
}
