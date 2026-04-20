import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import pool, { ensureBrandTables } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : {};

        if (!verifyAdminToken(payload.adminToken)) {
          throw new Error("Unauthorized");
        }

        const categories: string[] = Array.isArray(payload.categories)
          ? payload.categories.filter((c: unknown) => typeof c === "string")
          : [];
        const primary: string = typeof payload.category === "string"
          ? payload.category
          : categories[0];

        if (!primary) {
          throw new Error("category required");
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          tokenPayload: JSON.stringify({
            primary,
            categories: categories.length > 0 ? categories : [primary],
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        await ensureBrandTables();
        const parsed = tokenPayload ? JSON.parse(tokenPayload) : {};
        const primary: string = parsed.primary;
        const categories: string[] = Array.isArray(parsed.categories)
          ? parsed.categories
          : [primary];
        const filename = blob.pathname.split("/").pop() || "upload";

        await pool.query(
          `INSERT INTO brand_assets (filename, image_url, category, categories)
           VALUES ($1, $2, $3, $4)`,
          [filename, blob.url, primary, JSON.stringify(categories)]
        );
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
