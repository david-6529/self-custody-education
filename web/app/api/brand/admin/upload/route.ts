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

// PUT — client confirms a successful blob upload and we record it in the DB.
// The onUploadCompleted webhook from @vercel/blob is unreliable in our setup,
// so the client calls this directly after upload() resolves.
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const authFail = (() => {
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    return verifyAdminToken(token) ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  })();
  if (authFail) return authFail;

  try {
    const { url, pathname, category, categories, filename } = await request.json();
    if (!url || !category) {
      return NextResponse.json({ error: "url and category required" }, { status: 400 });
    }

    await ensureBrandTables();
    const cats: string[] = Array.isArray(categories) && categories.length > 0 ? categories : [category];
    const displayName: string = filename || (typeof pathname === "string" ? pathname.split("/").pop() : "upload") || "upload";

    const { rows } = await pool.query(
      `INSERT INTO brand_assets (filename, image_url, category, categories)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [displayName, url, category, JSON.stringify(cats)]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Finalize failed";
    console.error("[brand/admin/upload] PUT finalize error:", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch (e) {
    console.error("[brand/admin/upload] failed to parse request body", e);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[brand/admin/upload] BLOB_READ_WRITE_TOKEN missing at runtime");
    return NextResponse.json({ error: "Blob store not configured" }, { status: 500 });
  }

  console.log("[brand/admin/upload] handling body.type =", (body as any)?.type);

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : {};

        if (!verifyAdminToken(payload.adminToken)) {
          console.warn("[brand/admin/upload] admin token check failed");
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
        console.log("[brand/admin/upload] onUploadCompleted fired for", blob.pathname, "url:", blob.url);
        try {
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
          console.log("[brand/admin/upload] DB insert succeeded for", filename);
        } catch (dbErr) {
          console.error("[brand/admin/upload] DB insert FAILED:", dbErr);
          throw dbErr;
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed";
    console.error("[brand/admin/upload] handleUpload threw:", message, e);
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
