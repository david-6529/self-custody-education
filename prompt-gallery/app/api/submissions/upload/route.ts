import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const dynamic = "force-dynamic";

const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// POST — issues a signed client-upload token. Public endpoint (no admin auth)
// because prompt submissions are open to the community. Abuse control on the
// final /api/submissions insert (honeypot + per-IP rate limit) handles spam.
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob store not configured" }, { status: 500 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        tokenPayload: "",
      }),
      onUploadCompleted: async () => {
        // No-op. DB insert happens in /api/submissions after the client POSTs
        // metadata + the blob URLs back to us. The webhook is unreliable anyway.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload token failed";
    console.error("[submissions/upload] handleUpload error:", message, e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
