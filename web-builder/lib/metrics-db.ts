import pool from "./db";

/**
 * Small per-snapshot row in `metrics_snapshots`. One row per call to
 * /api/metrics; lets us rebuild historical charts that outlast
 * GitHub's 14-day traffic window.
 */
export interface MetricsSnapshot {
    ts: Date;
    stars: number;
    forks: number;
    openIssues: number;
    npmTotal: number;       // downloads in the last 30 days, per npm API
    views14d: number;       // null if PAT scope too narrow (stored as 0)
    uniqueVisitors14d: number;
    clones14d: number;
    uniqueCloners14d: number;
}

export async function ensureMetricsTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS metrics_snapshots (
            id BIGSERIAL PRIMARY KEY,
            ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            stars INTEGER NOT NULL DEFAULT 0,
            forks INTEGER NOT NULL DEFAULT 0,
            open_issues INTEGER NOT NULL DEFAULT 0,
            npm_total INTEGER NOT NULL DEFAULT 0,
            views_14d INTEGER NOT NULL DEFAULT 0,
            unique_visitors_14d INTEGER NOT NULL DEFAULT 0,
            clones_14d INTEGER NOT NULL DEFAULT 0,
            unique_cloners_14d INTEGER NOT NULL DEFAULT 0
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS metrics_snapshots_ts ON metrics_snapshots(ts DESC)`);
}

export async function insertSnapshot(s: MetricsSnapshot) {
    await pool.query(
        `INSERT INTO metrics_snapshots
            (ts, stars, forks, open_issues, npm_total, views_14d, unique_visitors_14d, clones_14d, unique_cloners_14d)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [s.ts, s.stars, s.forks, s.openIssues, s.npmTotal, s.views14d, s.uniqueVisitors14d, s.clones14d, s.uniqueCloners14d],
    );
}

export interface HistoricalPoint {
    day: string;    // YYYY-MM-DD
    stars: number;
    forks: number;
    npmTotal: number;
}

/**
 * One point per day — take the latest snapshot of that day so
 * multiple page loads the same day don't skew the chart.
 */
export async function getHistoricalSeries(days: number = 90): Promise<HistoricalPoint[]> {
    const { rows } = await pool.query(
        `
        SELECT
            TO_CHAR(DATE_TRUNC('day', ts), 'YYYY-MM-DD') AS day,
            (ARRAY_AGG(stars ORDER BY ts DESC))[1] AS stars,
            (ARRAY_AGG(forks ORDER BY ts DESC))[1] AS forks,
            (ARRAY_AGG(npm_total ORDER BY ts DESC))[1] AS npm_total
        FROM metrics_snapshots
        WHERE ts >= NOW() - ($1 || ' days')::INTERVAL
        GROUP BY DATE_TRUNC('day', ts)
        ORDER BY day ASC
        `,
        [days],
    );
    return rows.map(r => ({
        day: r.day,
        stars: Number(r.stars) || 0,
        forks: Number(r.forks) || 0,
        npmTotal: Number(r.npm_total) || 0,
    }));
}
