import { randomUUID } from "node:crypto";

import { supabase, supabaseConfigured } from "@/lib/supabase";

/**
 * RFQ uploads (plan row B2): the browser PUTs each file straight to a private Supabase Storage bucket through a signed
 * upload link, so no file passes through Vercel (4.5 MB request limit). Files land under incoming/ (cleared after a
 * day by the retention job if never submitted); on submit they are checked and moved to rfq/<reference>/, and sales get time-limited read
 * links. Setup: docs/supabase-setup.md.
 */

export const MAX_FILE = 25 * 1024 * 1024;
export const FILE_TYPES = /\.(pdf|dwg|docx|xlsx|zip)$/i;
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
 * Checks each uploaded file (the bucket's own size and type limits apply too) and moves it to rfq/<reference>/.
 * Returns null if any file is missing, too large or of a type the form does not accept.
 */
export async function promoteUploads(reference: string, files: { path: string; name: string }[]): Promise<StoredFile[] | null> {
  if (!files.every((f) => INCOMING.test(f.path) && FILE_TYPES.test(f.path) && FILE_TYPES.test(f.name))) return null;
  const paths = files.map((f) => f.path);
  const sizes = await Promise.all(paths.map((p) => bucket().info(p).then(({ data }) => data?.size ?? -1)));
  if (sizes.some((s) => s < 0 || s > MAX_FILE)) return null;

  return Promise.all(
    paths.map(async (path, i) => {
      const { name } = files[i];
      const dest = `rfq/${reference}/${path.split("/").pop()}`;
      const moved = await bucket().move(path, dest);
      if (moved.error) throw moved.error;
      const { data, error } = await bucket().createSignedUrl(dest, READ_DAYS * 24 * 60 * 60, { download: name });
      if (error) throw error;
      return { name, size: sizes[i], url: data.signedUrl };
    }),
  );
}
