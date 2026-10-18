import { llmsFull } from "@/lib/content/llms";

export const dynamic = "force-static";

export function GET() {
  return new Response(llmsFull(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
