import { NextResponse } from "next/server";
import pool, { ensureTable } from "@/lib/db";

// GET /api/overrides — public. Returns the admin-set overrides for built-in
// prompts so the public page can merge them onto the code defaults in
// app/prompts.ts.
export async function GET() {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT builtin_id, title, description, prompt, category, token_id, x_handle, updated_at
       FROM prompt_overrides`
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
