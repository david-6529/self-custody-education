/**
 * Backfill collection_snapshots from price_cache.
 *
 * For each historical day with sales, synthesizes a daily snapshot:
 *   floor_price = min sale price that day (proxy — sale floor, not listing floor)
 *   volume_24h  = sum of sale prices that day
 *   sales_24h   = count of sales that day
 *
 * ETH price is best-effort backfilled via CoinGecko's /coins/ethereum/history
 * endpoint when available; otherwise left null.
 *
 * Run with: npx tsx scripts/backfill-collection-snapshots.ts
 * Re-runnable: skips days that already have a 'backfill' source row.
 */

import pool, { GVC_IMAGE_FILTER } from "../lib/db";
import { ensureSnapshotsTable } from "../lib/snapshots";

const SUPPLY = 6969;

async function fetchEthPriceForDate(iso: string): Promise<number | null> {
  const [y, m, d] = iso.split("-");
  const dmy = `${d}-${m}-${y}`;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${dmy}&localization=false`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const usd = data?.market_data?.current_price?.usd;
    return typeof usd === "number" ? usd : null;
  } catch {
    return null;
  }
}

async function main() {
  await ensureSnapshotsTable();

  console.log("Aggregating sales by day from price_cache...");
  const { rows: days } = await pool.query(
    `SELECT
       date_trunc('day', created_at)::date AS day,
       MIN(price_eth) FILTER (WHERE price_eth > 0.1) AS floor_proxy,
       SUM(price_eth) FILTER (WHERE price_eth > 0) AS volume,
       COUNT(*) FILTER (WHERE price_eth > 0) AS sales
     FROM price_cache
     WHERE image_url LIKE $1
     GROUP BY 1
     ORDER BY 1 ASC`,
    [GVC_IMAGE_FILTER]
  );

  console.log(`Found ${days.length} days with sales data.`);

  const { rows: existing } = await pool.query(
    `SELECT DISTINCT date_trunc('day', created_at)::date AS day
     FROM collection_snapshots
     WHERE source = 'backfill'`
  );
  const existingDays = new Set(existing.map((r) => r.day.toISOString().slice(0, 10)));

  let inserted = 0;
  let skipped = 0;

  for (const row of days) {
    const iso = row.day.toISOString().slice(0, 10);
    if (existingDays.has(iso)) {
      skipped++;
      continue;
    }

    const floorPrice = parseFloat(row.floor_proxy) || null;
    const volume = parseFloat(row.volume) || null;
    const sales = parseInt(row.sales, 10) || 0;

    const ethPrice = await fetchEthPriceForDate(iso);
    const marketCap = floorPrice ? floorPrice * SUPPLY : null;

    await pool.query(
      `INSERT INTO collection_snapshots
         (created_at, floor_price, floor_price_usd, market_cap, market_cap_usd,
          volume_24h, volume_24h_usd, sales_24h, total_sales, eth_price, source)
       VALUES ($1::date + TIME '12:00:00', $2, $3, $4, $5, $6, $7, $8, NULL, $9, 'backfill')`,
      [
        iso,
        floorPrice,
        floorPrice && ethPrice ? floorPrice * ethPrice : null,
        marketCap,
        marketCap && ethPrice ? marketCap * ethPrice : null,
        volume,
        volume && ethPrice ? volume * ethPrice : null,
        sales,
        ethPrice,
      ]
    );

    inserted++;
    console.log(
      `[${iso}] floor=${floorPrice ?? "—"} vol=${volume?.toFixed(2) ?? "—"} sales=${sales} eth=${ethPrice ?? "—"}`
    );

    // Be polite to CoinGecko free tier (30 calls/min).
    await new Promise((r) => setTimeout(r, 2200));
  }

  console.log(`\nDone. Inserted ${inserted} days, skipped ${skipped} existing.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
