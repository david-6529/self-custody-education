import { NextRequest, NextResponse } from "next/server";
import pool, { ensureTable } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// PATCH /api/admin/override — upsert an override for a built-in prompt.
// Body: { builtin_id, title?, description?, prompt?, category?, token_id?, x_handle? }
export async function PATCH(request: NextRequest) {
  const authFail = requireAdmin(request);
  if (authFail) return authFail;

  try {
    await ensureTable();
    const body = await request.json();
    const { builtin_id, title, description, prompt, category, token_id, x_handle } = body;

    if (!builtin_id || typeof builtin_id !== "string") {
      return NextResponse.json({ error: "builtin_id required" }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO prompt_overrides (builtin_id, title, description, prompt, category, token_id, x_handle, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (builtin_id) DO UPDATE SET
         title = COALESCE(EXCLUDED.title, prompt_overrides.title),
         description = COALESCE(EXCLUDED.description, prompt_overrides.description),
         prompt = COALESCE(EXCLUDED.prompt, prompt_overrides.prompt),
         category = COALESCE(EXCLUDED.category, prompt_overrides.category),
         token_id = COALESCE(EXCLUDED.token_id, prompt_overrides.token_id),
         x_handle = COALESCE(EXCLUDED.x_handle, prompt_overrides.x_handle),
         updated_at = NOW()
       RETURNING *`,
      [
        builtin_id,
        typeof title === "string" ? title : null,
        typeof description === "string" ? description : null,
        typeof prompt === "string" ? prompt : null,
        typeof category === "string" ? category : null,
        typeof token_id === "string" ? token_id : null,
        typeof x_handle === "string" ? x_handle.replace(/^@/, "") : null,
      ]
    );

    return NextResponse.json(rows[0]);
  } catch (e: any) {
    console.error("Override upsert failed:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/admin/override?builtin_id=... — remove an override, reverting to
// whatever app/prompts.ts defines.
export async function DELETE(request: NextRequest) {
  const authFail = requireAdmin(request);
  if (authFail) return authFail;

  try {
    const builtin_id = request.nextUrl.searchParams.get("builtin_id");
    if (!builtin_id) {
      return NextResponse.json({ error: "builtin_id required" }, { status: 400 });
    }
    await pool.query("DELETE FROM prompt_overrides WHERE builtin_id = $1", [builtin_id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
