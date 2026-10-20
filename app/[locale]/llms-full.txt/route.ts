import { llmsFull } from "@/lib/content/llms";

// /ar/llms-full.txt. English lives at /llms-full.txt (app/llms-full.txt).
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "ar" }];
}

export function GET() {
  return new Response(llmsFull("ar"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
