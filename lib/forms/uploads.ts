import { randomUUID } from "node:crypto";

import { supabase, supabaseConfigured } from "@/lib/supabase";

/**
 * RFQ uploads (plan row B2): the browser PUTs each file straight to a private Supabase Storage bucket through a signed
 * upload link, so no file passes through Vercel (4.5 MB request limit). Files land under incoming/ (cleared after a
 * day by the retention job if never submitted); on submit they are checked and moved to rfq/<reference>/, and sales get time-limited read
 * links. Setup: docs/supabase-setup.md.
 */

/** Per form: accepted types, size cap and the folder files are filed under after submit (retention: B4 daily job). */
export const UPLOAD_KINDS = {
  rfq: { types: /\.(pdf|dwg|docx|xlsx|zip)$/i, max: 25 * 1024 * 1024, folder: "rfq" },
  careers: { types: /\.(pdf|docx)$/i, max: 5 * 1024 * 1024, folder: "careers" },
} as const;
export type UploadKind = keyof typeof UPLOAD_KINDS;
export const MAX_FILES = 20;
const READ_DAYS = 7;
const INCOMING = /^incoming\/[0-9a-f-]{36}\/[^/]+$/;

export type UploadTarget = { path: string; url: string };
export type StoredFile = { name: string; size: number; url: string };

const bucket = () => supabase().storage.from(process.env.SUPABASE_BUCKET ?? "rfq-files");
export const uploadsConfigured = supabaseConfigured;

/** Storage keys must be ASCII: other characters become "_" (the original name is kept for the email and download). */
const safeName = (name: string) => name.replace(/[^A-Za-z0-9._ -]/g, "_").slice(-100);

/** One signed upload link per file (Supabase keeps them valid for 2 hours). */
export async function uploadTargets(names: string[]): Promise<UploadTarget[]> {
  return Promise.all(
    names.map(async (name) => {
      const { data, error } = await bucket().createSignedUploadUrl(`incoming/${randomUUID()}/${safeName(name)}`);
      if (error) throw error;
      return { path: data.path, url: data.signedUrl };
    }),
  );
}

/**
 * Checks each uploaded file (the bucket's own size and type limits apply too) and moves it to <folder>/<reference>/.
 * Returns null if any file is missing, too large or of a type the form does not accept.
 */
export async function promoteUploads(reference: string, files: { path: string; name: string }[], kind: UploadKind = "rfq"): Promise<StoredFile[] | null> {
  const { types, max, folder } = UPLOAD_KINDS[kind];
  if (!files.every((f) => INCOMING.test(f.path) && types.test(f.path) && types.test(f.name))) return null;
  const paths = files.map((f) => f.path);
  const sizes = await Promise.all(paths.map((p) => bucket().info(p).then(({ data }) => data?.size ?? -1)));
  if (sizes.some((s) => s < 0 || s > max)) return null;

  return Promise.all(
    paths.map(async (path, i) => {
      const { name } = files[i];
      const dest = `${folder}/${reference}/${path.split("/").pop()}`;
      const moved = await bucket().move(path, dest);
      if (moved.error) throw moved.error;
      const { data, error } = await bucket().createSignedUrl(dest, READ_DAYS * 24 * 60 * 60, { download: name });
      if (error) throw error;
      return { name, size: sizes[i], url: data.signedUrl };
    }),
  );
}

/** Every document in vendor-pack/ (uploaded by Fuerte in the Supabase dashboard), as time-limited download links. */
export async function vendorPackLinks(): Promise<StoredFile[]> {
  const { data, error } = await bucket().list("vendor-pack", { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  const docs = (data ?? []).filter((f) => f.id && !f.name.startsWith("."));
  return Promise.all(
    docs.map(async (f) => {
      const signed = await bucket().createSignedUrl(`vendor-pack/${f.name}`, READ_DAYS * 24 * 60 * 60, { download: f.name });
      if (signed.error) throw signed.error;
      return { name: f.name, size: (f.metadata as { size?: number } | null)?.size ?? 0, url: signed.data.signedUrl };
    }),
  );
}
