import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureSnapshotsTable, mapRow } from "@/lib/snapshots";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    await ensureSnapshotsTable();

    const params = request.nextUrl.searchParams;
    const interval = (params.get("interval") || "daily").toLowerCase();
    const limitParam = params.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10)), 1000)
      : 90;

    let query: string;
    if (interval === "hourly") {
      query = `
        SELECT DISTINCT ON (date_trunc('hour', created_at))
          created_at, floor_price, floor_price_usd, market_cap, market_cap_usd,
          volume_24h, volume_24h_usd, sales_24h, total_sales, eth_price, source
        FROM collection_snapshots
        ORDER BY date_trunc('hour', created_at) DESC, created_at DESC
        LIMIT $1
      `;
    } else if (interval === "raw") {
      query = `
        SELECT created_at, floor_price, floor_price_usd, market_cap, market_cap_usd,
          volume_24h, volume_24h_usd, sales_24h, total_sales, eth_price, source
        FROM collection_snapshots
        ORDER BY created_at DESC
        LIMIT $1
      `;
    } else {
      query = `
        SELECT DISTINCT ON (date_trunc('day', created_at))
          created_at, floor_price, floor_price_usd, market_cap, market_cap_usd,
          volume_24h, volume_24h_usd, sales_24h, total_sales, eth_price, source
        FROM collection_snapshots
        ORDER BY date_trunc('day', created_at) DESC, created_at DESC
        LIMIT $1
      `;
    }

    const { rows } = await pool.query(query, [limit]);
    const data = rows.map(mapRow).reverse();

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
