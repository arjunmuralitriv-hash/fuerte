import { llmsIndex } from "@/lib/content/llms";

// /ar/llms.txt. English lives at /llms.txt (app/llms.txt), where llmstxt.org expects it.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "ar" }];
}

export function GET() {
  return new Response(llmsIndex("ar"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
