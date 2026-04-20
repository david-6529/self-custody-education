import { NextRequest, NextResponse } from "next/server";
import pool, { ensureTable } from "@/lib/db";

const MAX_TEXT_LEN = 4000;
const RATE_LIMIT_WINDOW_MIN = 60;
const RATE_LIMIT_MAX = 5;

// Only allow blob URLs from our own Vercel Blob store. Prevents submitters from
// pointing at arbitrary external URLs and using our DB as a bookmark farm.
function isValidBlobUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

async function checkRateLimit(ip: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM submission_rate_log
     WHERE ip = $1 AND created_at > NOW() - INTERVAL '${RATE_LIMIT_WINDOW_MIN} minutes'`,
    [ip]
  );
  return rows[0].cnt < RATE_LIMIT_MAX;
}

async function recordRateLimitHit(ip: string): Promise<void> {
  await pool.query("INSERT INTO submission_rate_log (ip) VALUES ($1)", [ip]);
  // Opportunistic cleanup — drop rows older than 24h on a fraction of requests
  if (Math.random() < 0.05) {
    await pool
      .query(
        "DELETE FROM submission_rate_log WHERE created_at < NOW() - INTERVAL '24 hours'"
      )
      .catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title : "";
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    const tokenId = typeof body.tokenId === "string" ? body.tokenId : "";
    const xHandle = typeof body.xHandle === "string" ? body.xHandle : "";
    const description = typeof body.description === "string" ? body.description : "";
    const moreDetails = typeof body.moreDetails === "string" ? body.moreDetails : "";
    const honeypot = typeof body.website === "string" ? body.website : "";
    const imageUrl = body.imageUrl;
    const refImageUrls = Array.isArray(body.refImageUrls) ? body.refImageUrls : [];

    // Honeypot — real users leave this empty; bots fill all fields
    if (honeypot.trim().length > 0) {
      return NextResponse.json({ id: "ok", status: "pending" }, { status: 201 });
    }

    if (!title || !prompt || !tokenId || !description || !imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields: title, prompt, tokenId, description, imageUrl" },
        { status: 400 }
      );
    }

    if (
      title.length > 200 ||
      prompt.length > MAX_TEXT_LEN ||
      description.length > MAX_TEXT_LEN ||
      moreDetails.length > MAX_TEXT_LEN
    ) {
      return NextResponse.json({ error: "Input exceeds max length" }, { status: 400 });
    }

    if (!isValidBlobUrl(imageUrl)) {
      return NextResponse.json({ error: "Invalid imageUrl" }, { status: 400 });
    }
    if (refImageUrls.some((u) => !isValidBlobUrl(u))) {
      return NextResponse.json({ error: "Invalid refImageUrls" }, { status: 400 });
    }
    if (refImageUrls.length > 10) {
      return NextResponse.json({ error: "Too many reference images (max 10)" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many submissions. Please try again in ${RATE_LIMIT_WINDOW_MIN} minutes.` },
        { status: 429 }
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO prompt_submissions (title, prompt, token_id, image_url, x_handle, description, more_details, ref_images, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING id, title, status, created_at`,
      [
        title,
        prompt,
        tokenId,
        imageUrl,
        xHandle || null,
        description,
        moreDetails || null,
        refImageUrls.length > 0 ? JSON.stringify(refImageUrls) : null,
      ]
    );

    await recordRateLimitHit(ip);

    return NextResponse.json(rows[0], { status: 201 });
  } catch (e: any) {
    console.error("Submission error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT id, title, prompt, token_id, image_url, x_handle, status, category, generations, description, ref_images, requires_ref_images, created_at
       FROM prompt_submissions
       WHERE status = 'approved'
       ORDER BY created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
