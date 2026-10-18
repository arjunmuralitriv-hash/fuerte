import { absoluteUrl } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

/** RFC 9116. Expires one year after each build, so every deploy renews it. */
export function GET() {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const lines = [
    ...(SITE.email ? [`Contact: mailto:${SITE.email}`] : []),
    `Contact: ${absoluteUrl("/en/legal/responsible-disclosure")}`,
    `Expires: ${expires}`,
    `Policy: ${absoluteUrl("/en/legal/responsible-disclosure")}`,
    "Preferred-Languages: en, ar",
    `Canonical: ${absoluteUrl("/.well-known/security.txt")}`,
  ];
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
