import { hasLocale } from "next-intl";

import { routing } from "@/i18n/routing";
import { knowledge, KNOWLEDGE_HEADERS } from "@/lib/content/knowledge";

// /api/knowledge/en and /api/knowledge/ar, built once per deploy.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return new Response("Not found", { status: 404 });
  return Response.json(await knowledge(locale), { headers: KNOWLEDGE_HEADERS });
}
