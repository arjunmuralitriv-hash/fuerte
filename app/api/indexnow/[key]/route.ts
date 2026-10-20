// IndexNow key file, served at /{INDEXNOW_KEY}.txt through the rewrite in next.config.ts.
// Search engines fetch it to confirm that pings from scripts/indexnow.mjs come from this site.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const expected = process.env.INDEXNOW_KEY;
  if (!expected || key !== expected) return new Response("Not found", { status: 404 });
  return new Response(expected, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
