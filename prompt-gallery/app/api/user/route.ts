import { NextRequest, NextResponse } from "next/server";
import pool, { ensureTable } from "@/lib/db";
import { put } from "@vercel/blob";

// GET /api/user?wallet=0x...&type=outputs|references
export async function GET(req: NextRequest) {
  await ensureTable();
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
  const type = req.nextUrl.searchParams.get("type") || "outputs";

  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  const table = type === "references" ? "user_references" : "user_outputs";
  const { rows } = await pool.query(
    `SELECT * FROM ${table} WHERE wallet_address = $1 ORDER BY created_at DESC`,
    [wallet]
  );

  return NextResponse.json(rows);
}

// POST /api/user — save an output or reference image
export async function POST(req: NextRequest) {
  await ensureTable();

  const formData = await req.formData();
  const wallet = (formData.get("wallet") as string)?.toLowerCase();
  const type = (formData.get("type") as string) || "output";
  const file = formData.get("file") as File | null;
  const imageUrl = formData.get("image_url") as string | null;
  const promptId = formData.get("prompt_id") as string | null;
  const promptTitle = formData.get("prompt_title") as string | null;
  const tokenId = formData.get("token_id") as string | null;
  const label = formData.get("label") as string | null;
  const notes = formData.get("notes") as string | null;

  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  // Resolve image URL: either uploaded file or passed URL
  let finalUrl = imageUrl || "";
  if (file && file.size > 0) {
    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 4.5MB)" },
        { status: 400 }
      );
    }
    const blob = await put(
      `user-saves/${wallet.slice(0, 8)}/${Date.now()}-${file.name}`,
      file,
      { access: "public" }
    );
    finalUrl = blob.url;
  }

  if (!finalUrl) {
    return NextResponse.json(
      { error: "file or image_url required" },
      { status: 400 }
    );
  }

  if (type === "reference") {
    const { rows } = await pool.query(
      `INSERT INTO user_references (wallet_address, image_url, label, token_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [wallet, finalUrl, label || null, tokenId || null]
    );
    return NextResponse.json(rows[0], { status: 201 });
  }

  // Default: output
  const { rows } = await pool.query(
    `INSERT INTO user_outputs (wallet_address, image_url, prompt_id, prompt_title, token_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [wallet, finalUrl, promptId || null, promptTitle || null, tokenId || null, notes || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
}

// DELETE /api/user?id=...&type=outputs|references
export async function DELETE(req: NextRequest) {
  await ensureTable();
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type") || "outputs";
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();

  if (!id || !wallet) {
    return NextResponse.json(
      { error: "id and wallet required" },
      { status: 400 }
    );
  }

  const table = type === "references" ? "user_references" : "user_outputs";
  await pool.query(
    `DELETE FROM ${table} WHERE id = $1 AND wallet_address = $2`,
    [id, wallet]
  );

  return NextResponse.json({ ok: true });
}
