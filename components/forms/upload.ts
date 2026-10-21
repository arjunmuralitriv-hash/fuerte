import { prepareUploads } from "@/lib/forms/actions";
import type { UploadKind } from "@/lib/forms/uploads";

export type UploadResult = { status: "ok"; uploads: string } | { status: "invalid"; error: string } | { status: "failed" };

/**
 * Uploads files straight to storage through signed links (lib/forms/uploads.ts) and returns the "uploads" form value
 * ([{ name, path }]). Without storage (local dev) the files are only named.
 */
export async function uploadFiles(locale: string, files: File[], kind: UploadKind): Promise<UploadResult> {
  try {
    const plan = await prepareUploads(locale, files.map((x) => ({ name: x.name, size: x.size })), kind);
    if (plan.status === "invalid") return plan;
    if (plan.status === "failed") return plan;
    if (plan.status === "ready") {
      await Promise.all(
        plan.targets.map((target, i) =>
          fetch(target.url, { method: "PUT", headers: { "Content-Type": files[i].type || "application/octet-stream", "x-upsert": "false" }, body: files[i] }).then((r) => {
            if (!r.ok) throw new Error(`upload ${r.status}`);
          }),
        ),
      );
    }
    return { status: "ok", uploads: JSON.stringify(files.map((x, i) => ({ name: x.name, path: plan.status === "ready" ? plan.targets[i].path : undefined }))) };
  } catch (error) {
    console.error(`[${kind}] upload failed`, error);
    return { status: "failed" };
  }
}
