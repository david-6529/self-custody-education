import pool from "./db";

let ensured = false;

export async function ensureSnapshotsTable() {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collection_snapshots (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      floor_price NUMERIC,
      floor_price_usd NUMERIC,
      market_cap NUMERIC,
      market_cap_usd NUMERIC,
      volume_24h NUMERIC,
      volume_24h_usd NUMERIC,
      sales_24h INTEGER,
      total_sales INTEGER,
      eth_price NUMERIC,
      source TEXT NOT NULL DEFAULT 'live'
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS collection_snapshots_created_at_idx
      ON collection_snapshots (created_at DESC);
  `);
  ensured = true;
}

export interface CollectionSnapshot {
  createdAt: Date;
  floorPrice: number | null;
  floorPriceUsd: number | null;
  marketCap: number | null;
  marketCapUsd: number | null;
  volume24h: number | null;
  volume24hUsd: number | null;
  sales24h: number | null;
  totalSales: number | null;
  ethPrice: number | null;
  source: "live" | "backfill";
}

export function mapRow(r: any): CollectionSnapshot {
  return {
    createdAt: r.created_at,
    floorPrice: r.floor_price !== null ? parseFloat(r.floor_price) : null,
    floorPriceUsd: r.floor_price_usd !== null ? parseFloat(r.floor_price_usd) : null,
    marketCap: r.market_cap !== null ? parseFloat(r.market_cap) : null,
    marketCapUsd: r.market_cap_usd !== null ? parseFloat(r.market_cap_usd) : null,
    volume24h: r.volume_24h !== null ? parseFloat(r.volume_24h) : null,
    volume24hUsd: r.volume_24h_usd !== null ? parseFloat(r.volume_24h_usd) : null,
    sales24h: r.sales_24h !== null ? parseInt(r.sales_24h, 10) : null,
    totalSales: r.total_sales !== null ? parseInt(r.total_sales, 10) : null,
    ethPrice: r.eth_price !== null ? parseFloat(r.eth_price) : null,
    source: r.source,
  };
}
