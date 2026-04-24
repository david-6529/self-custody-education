import { NextRequest, NextResponse } from "next/server";
import pool, { GVC_IMAGE_FILTER } from "@/lib/db";
import { ensureSnapshotsTable } from "@/lib/snapshots";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSnapshotsTable();

    const [ethRes, depthRes, salesStats] = await Promise.all([
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        { cache: "no-store" }
      ).then((r) => r.json()).catch(() => null),
      pool.query(
        "SELECT value FROM cache_entries WHERE key = 'market-depth-good-vibes-club' LIMIT 1"
      ).catch(() => ({ rows: [] as any[] })),
      pool.query(
        `SELECT
          COUNT(*) as total_sales,
          SUM(price_eth) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as volume_24h,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as sales_24h
        FROM price_cache
        WHERE price_eth > 0 AND image_url LIKE $1`,
        [GVC_IMAGE_FILTER]
      ),
    ]);

    const ethPrice = ethRes?.ethereum?.usd ?? 0;

    let floorPrice = 0;
    if (depthRes.rows.length) {
      const depth = depthRes.rows[0].value;
      floorPrice = depth.lowestListing ?? 0;
    }
    if (!floorPrice) {
      const fallback = await pool.query(
        "SELECT MIN(price_eth) as floor FROM price_cache WHERE price_eth > 0.1 AND created_at > NOW() - INTERVAL '7 days' AND image_url LIKE $1",
        [GVC_IMAGE_FILTER]
      );
      floorPrice = parseFloat(fallback.rows[0]?.floor) || 0;
    }

    const stats = salesStats.rows[0];
    const volume24h = parseFloat(stats.volume_24h) || 0;
    const totalSales = parseInt(stats.total_sales, 10) || 0;
    const sales24h = parseInt(stats.sales_24h, 10) || 0;

    const marketCap = floorPrice * 6969;

    const { rows } = await pool.query(
      `INSERT INTO collection_snapshots
        (floor_price, floor_price_usd, market_cap, market_cap_usd,
         volume_24h, volume_24h_usd, sales_24h, total_sales, eth_price, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'live')
       RETURNING id, created_at`,
      [
        floorPrice || null,
        floorPrice ? floorPrice * ethPrice : null,
        marketCap || null,
        marketCap ? marketCap * ethPrice : null,
        volume24h || null,
        volume24h ? volume24h * ethPrice : null,
        sales24h,
        totalSales,
        ethPrice || null,
      ]
    );

    return NextResponse.json({ ok: true, id: rows[0].id, createdAt: rows[0].created_at });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
