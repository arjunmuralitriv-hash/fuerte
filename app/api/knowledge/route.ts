import { routing } from "@/i18n/routing";
import { knowledge, KNOWLEDGE_HEADERS } from "@/lib/content/knowledge";

// /api/knowledge: the default locale; /api/knowledge/ar for Arabic.
export const dynamic = "force-static";

export async function GET() {
  return Response.json(await knowledge(routing.defaultLocale), { headers: KNOWLEDGE_HEADERS });
}
