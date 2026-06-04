/**
 * File upload utility — uploads to Cloudflare R2 via presigned PUT URLs.
 * Falls back to a base64 data URL when the presign endpoint is unavailable
 * (local dev without R2 env vars configured).
 */

export type UploadFolder = 'logos' | 'banners' | 'videos' | 'decks' | 'photos';

/** Dev-mode fallback: read a File as a base64 data URL. */
const toDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });

/**
 * Upload a file to Cloudflare R2.
 *
 * 1. Fetches a short-lived presigned PUT URL from /api/upload/presign
 * 2. PUTs the file directly from the browser to R2 (no Vercel bandwidth used)
 * 3. Returns the permanent public CDN URL
 *
 * In local dev without R2 env vars, falls back to a base64 data URL so the
 * UI stays functional. In production, errors are thrown so callers can surface
 * them to the user instead of silently storing ephemeral data: strings.
 */
export async function uploadFile(file: File, folder: UploadFolder): Promise<string> {
  try {
    const params = new URLSearchParams({
      filename: file.name,
      contentType: file.type,
      folder,
    });

    const presignRes = await fetch(`/api/upload/presign?${params.toString()}`);

    if (!presignRes.ok) {
      if (import.meta.env.DEV) {
        console.warn('[upload] Presign endpoint unavailable, using data URL fallback (dev only)');
        return toDataUrl(file);
      }
      const body = await presignRes.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `Presign failed: ${presignRes.status}`);
    }

    const { uploadUrl, publicUrl } = (await presignRes.json()) as {
      uploadUrl: string;
      publicUrl: string;
    };

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    if (!putRes.ok) {
      throw new Error(`R2 PUT failed with status ${putRes.status}`);
    }

    return publicUrl;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[upload] Upload failed, falling back to data URL (dev only):', err);
      return toDataUrl(file);
    }
    throw err;
  }
}
