"use client";

import { useCallback, useEffect, useState } from "react";

interface MetricsPayload {
    config: { npmPackage: string; githubRepo: string; hasGithubToken: boolean; gaConfigured: boolean };
    ga: {
        summary: { sessions: number; users: number; pageviews: number };
        daily: Array<{ date: string; sessions: number; users: number; pageviews: number }>;
        topPages: Array<{ label: string; sessions: number; users: number }>;
        topSources: Array<{ label: string; sessions: number; users: number }>;
        activeNow: number;
    } | null;
    gaError?: string | null;
    npm: {
        last30Days: number | null;
        daily: Array<{ day: string; downloads: number }>;
    };
    github: {
        stars: number | null;
        forks: number | null;
        watchers: number | null;
        openIssues: number | null;
        latestRelease: { tag: string; publishedAt: string; url: string } | null;
        traffic: {
            views14d: { count: number; uniques: number; views?: Array<{ timestamp: string; count: number; uniques: number }> } | null;
            clones14d: { count: number; uniques: number; clones?: Array<{ timestamp: string; count: number; uniques: number }> } | null;
            referrers: Array<{ referrer?: string; count: number; uniques: number }> | null;
            paths: Array<{ path?: string; title?: string; count: number; uniques: number }> | null;
            trafficAccessible: boolean;
        };
    };
    history: Array<{ day: string; stars: number; forks: number; npmTotal: number }>;
}

const TOKEN_STORAGE = "gvc-admin-metrics-token";

export default function MetricsPage() {
    const [token, setToken] = useState("");
    const [input, setInput] = useState("");
    const [data, setData] = useState<MetricsPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const saved = typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE) : null;
        if (saved) setToken(saved);
    }, []);

    const load = useCallback(async (t: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/metrics", { headers: { Authorization: `Bearer ${t}` } });
            if (res.status === 401) {
                setError("Unauthorized — check your ADMIN_TOKEN.");
                setData(null);
                localStorage.removeItem(TOKEN_STORAGE);
                setToken("");
                return;
            }
            if (!res.ok) { setError(`Fetch failed: ${res.status}`); return; }
            setData(await res.json());
        } catch (e) {
            setError(`Network error: ${(e as Error).message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) load(token);
    }, [token, load]);

    if (!token) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
                <form
                    className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-xl p-6"
                    onSubmit={e => {
                        e.preventDefault();
                        if (!input.trim()) return;
                        localStorage.setItem(TOKEN_STORAGE, input.trim());
                        setToken(input.trim());
                    }}
                >
                    <h1 className="text-lg font-semibold mb-2">Admin Metrics</h1>
                    <p className="text-sm text-neutral-400 mb-4">Paste your <code className="text-neutral-200">ADMIN_TOKEN</code>.</p>
                    <input
                        type="password"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Token"
                        className="w-full bg-black border border-neutral-700 rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:border-neutral-400"
                        autoFocus
                    />
                    <button type="submit" className="w-full bg-white text-black rounded-md py-2 text-sm font-medium hover:bg-neutral-200">
                        Unlock
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <header className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Builder Kit — Metrics</h1>
                        {data && (
                            <p className="text-sm text-neutral-400 mt-1">
                                <code>{data.config.npmPackage}</code> · <code>{data.config.githubRepo}</code>
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => load(token)}
                            disabled={loading}
                            className="text-xs bg-neutral-900 border border-neutral-700 hover:border-neutral-500 rounded-md px-3 py-1.5 disabled:opacity-50"
                        >
                            {loading ? "Refreshing…" : "Refresh"}
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem(TOKEN_STORAGE);
                                setToken("");
                            }}
                            className="text-xs text-neutral-400 hover:text-white"
                        >
                            Sign out
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="bg-red-950/40 border border-red-900 rounded-md px-4 py-3 text-sm text-red-200 mb-6">
                        {error}
                    </div>
                )}

                {data && (
                    <>
                        {/* Top cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                            <Stat label="Stars" value={data.github.stars} />
                            <Stat label="Forks" value={data.github.forks} />
                            <Stat label="Open Issues" value={data.github.openIssues} />
                            <Stat label="npm — 30d" value={data.npm.last30Days?.toLocaleString() ?? "—"} />
                            <Stat
                                label="GA Users (since 4/14)"
                                value={data.ga ? data.ga.summary.users.toLocaleString() : "—"}
                            />
                        </div>

                        {/* Real-time hero — stands on its own so the number
                            is the first thing you see in the GA section. */}
                        {data.ga && (
                            <div
                                className="relative mb-4 rounded-2xl p-6 flex items-center justify-between overflow-hidden"
                                style={{
                                    background: "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(6,95,70,0.35) 100%)",
                                    border: "1px solid rgba(16,185,129,0.35)",
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                                    </span>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80">
                                            Active now · goodvibesclub.ai
                                        </div>
                                        <div className="text-5xl font-bold tabular-nums text-white mt-1 leading-none">
                                            {data.ga.activeNow.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-emerald-200/70 mt-1">
                                            Users on the site in the last 30 minutes
                                        </div>
                                    </div>
                                </div>
                                <a
                                    href={`https://analytics.google.com/analytics/web/#/p${data.config.gaConfigured ? "" : ""}/realtime/overview`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-emerald-200/70 hover:text-emerald-100 transition-colors"
                                >
                                    View in GA →
                                </a>
                            </div>
                        )}

                        {/* GA traffic */}
                        <section className="mb-8">
                            <h2 className="text-sm font-semibold text-neutral-300 mb-3">
                                goodvibesclub.ai — daily totals
                            </h2>
                            {!data.config.gaConfigured ? (
                                <div className="bg-amber-950/30 border border-amber-900/60 rounded-xl p-4 text-sm">
                                    <p className="text-amber-200 font-medium">GA not configured</p>
                                    <p className="text-amber-200/70 mt-1 leading-relaxed">
                                        Set <code>GA_PROPERTY_ID</code> and{" "}
                                        <code>GA_SERVICE_ACCOUNT_JSON_BASE64</code> in Vercel and grant the service
                                        account Viewer access on the GA4 property. Reload this page to pull data.
                                    </p>
                                </div>
                            ) : !data.ga ? (
                                <div className="bg-red-950/30 border border-red-900/60 rounded-xl p-4 text-sm text-red-200">
                                    <p className="font-medium">GA is configured but the report call failed.</p>
                                    {data.gaError && (
                                        <pre className="mt-2 text-[11px] font-mono text-red-200/80 whitespace-pre-wrap break-words">
                                            {data.gaError}
                                        </pre>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {data.ga.summary.sessions === 0 && data.ga.summary.pageviews === 0 && (
                                        <div className="bg-blue-950/30 border border-blue-900/60 rounded-xl p-3 text-xs text-blue-200/80 mb-3">
                                            No aggregated data yet for this window. GA4 has a 24-48h
                                            processing lag for new properties — if the &ldquo;Active now&rdquo;
                                            counter above is non-zero, events are flowing and daily totals
                                            will catch up shortly.
                                        </div>
                                    )}
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        <Stat label="Sessions (since 4/14)" value={data.ga.summary.sessions.toLocaleString()} />
                                        <Stat label="Users (since 4/14)" value={data.ga.summary.users.toLocaleString()} />
                                        <Stat label="Pageviews (since 4/14)" value={data.ga.summary.pageviews.toLocaleString()} />
                                    </div>
                                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-3">
                                        <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
                                            Daily sessions
                                        </div>
                                        <LineChart
                                            points={data.ga.daily.map(d => ({ label: d.date, value: d.sessions }))}
                                            color="#22d3ee"
                                            height={160}
                                        />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        <TopTable
                                            title="Top pages"
                                            rows={data.ga.topPages.map(r => ({ path: r.label, count: r.sessions, uniques: r.users }))}
                                            labelKey="path"
                                        />
                                        <TopTable
                                            title="Top sources"
                                            rows={data.ga.topSources.map(r => ({ referrer: r.label, count: r.sessions, uniques: r.users }))}
                                            labelKey="referrer"
                                        />
                                    </div>
                                </>
                            )}
                        </section>

                        {/* npm daily chart */}
                        <section className="mb-8">
                            <h2 className="text-sm font-semibold text-neutral-300 mb-3">
                                npm daily downloads — last 90 days
                            </h2>
                            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                                <LineChart
                                    points={data.npm.daily.map(d => ({ label: d.day, value: d.downloads }))}
                                    color="#8b5cf6"
                                    height={180}
                                />
                                <p className="text-[10px] text-neutral-500 mt-2">
                                    Total in window: {data.npm.daily.reduce((a, b) => a + b.downloads, 0).toLocaleString()}
                                </p>
                            </div>
                        </section>

                        {/* GitHub traffic section */}
                        <section className="mb-8">
                            <h2 className="text-sm font-semibold text-neutral-300 mb-3">
                                GitHub traffic — last 14 days
                            </h2>
                            {!data.github.traffic.trafficAccessible ? (
                                <div className="bg-amber-950/30 border border-amber-900/60 rounded-xl p-4 text-sm">
                                    <p className="text-amber-200 font-medium">PAT scope too narrow</p>
                                    <p className="text-amber-200/70 mt-1">
                                        The <code>public_repo</code> scope doesn&apos;t cover <code>/traffic/*</code> endpoints.
                                        Rotate your PAT with <code>repo</code> (or fine-grained with
                                        &ldquo;Administration: Read&rdquo;) and re-set <code>GITHUB_TOKEN</code> on Vercel
                                        to enable visitor + clone counts here.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-3">
                                    <TrafficCard
                                        title="Views"
                                        totals={data.github.traffic.views14d}
                                        series={data.github.traffic.views14d?.views}
                                    />
                                    <TrafficCard
                                        title="Clones"
                                        totals={data.github.traffic.clones14d}
                                        series={data.github.traffic.clones14d?.clones}
                                    />
                                </div>
                            )}
                        </section>

                        {/* Referrers + paths */}
                        {(data.github.traffic.referrers?.length || data.github.traffic.paths?.length) ? (
                            <section className="mb-8 grid md:grid-cols-2 gap-3">
                                <TopTable title="Top referrers" rows={data.github.traffic.referrers || []} labelKey="referrer" />
                                <TopTable title="Top paths" rows={data.github.traffic.paths || []} labelKey="path" />
                            </section>
                        ) : null}

                        {/* Historical stars chart (accumulates over time) */}
                        {data.history.length >= 2 && (
                            <section className="mb-8">
                                <h2 className="text-sm font-semibold text-neutral-300 mb-3">
                                    Stars over time — from snapshots ({data.history.length} days tracked)
                                </h2>
                                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                                    <LineChart
                                        points={data.history.map(h => ({ label: h.day, value: h.stars }))}
                                        color="#eab308"
                                        height={140}
                                    />
                                </div>
                            </section>
                        )}

                        {/* GA link */}
                        <section className="text-xs text-neutral-500 mt-12 pt-6 border-t border-neutral-900">
                            <p>
                                Web traffic for goodvibesclub.ai: tracked via Google Analytics (<code>G-973ZNHQPQ9</code>).
                                {" "}
                                <a
                                    href="https://analytics.google.com/analytics/web/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-white"
                                >
                                    Open GA dashboard →
                                </a>
                            </p>
                            <p className="mt-1">
                                Data snapshot stored at every load; charts above build history over days. Latest release:{" "}
                                {data.github.latestRelease ? (
                                    <a className="underline hover:text-white" href={data.github.latestRelease.url} target="_blank" rel="noopener noreferrer">
                                        {data.github.latestRelease.tag}
                                    </a>
                                ) : "none"}
                                .
                            </p>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number | string | null | undefined }) {
    return (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">{label}</div>
            <div className="text-2xl font-semibold tabular-nums">
                {value === null || value === undefined ? "—" : value}
            </div>
        </div>
    );
}

function TrafficCard({
    title,
    totals,
    series,
}: {
    title: string;
    totals: { count: number; uniques: number } | null;
    series?: Array<{ timestamp: string; count: number; uniques: number }>;
}) {
    return (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-baseline justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-neutral-500">{title}</span>
                <span className="text-xs text-neutral-400">
                    {totals?.uniques ?? 0} unique / {totals?.count ?? 0} total
                </span>
            </div>
            {series && series.length > 0 ? (
                <LineChart
                    points={series.map(s => ({ label: s.timestamp.slice(0, 10), value: s.count }))}
                    color={title === "Views" ? "#10b981" : "#06b6d4"}
                    height={100}
                />
            ) : (
                <p className="text-xs text-neutral-500">No series data in the window.</p>
            )}
        </div>
    );
}

function TopTable({
    title,
    rows,
    labelKey,
}: {
    title: string;
    rows: Array<{ referrer?: string; path?: string; title?: string; count: number; uniques: number }>;
    labelKey: "referrer" | "path";
}) {
    return (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">{title}</div>
            {rows.length === 0 ? (
                <p className="text-xs text-neutral-500">No data.</p>
            ) : (
                <table className="w-full text-xs">
                    <tbody>
                        {rows.slice(0, 10).map((r, i) => {
                            const label = (r[labelKey] || r.title || "(unknown)") as string;
                            return (
                                <tr key={i} className="border-b border-neutral-900 last:border-0">
                                    <td className="py-1.5 truncate max-w-[240px] text-neutral-300">{label}</td>
                                    <td className="py-1.5 text-right text-neutral-500">{r.uniques}</td>
                                    <td className="py-1.5 text-right tabular-nums">{r.count}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}

function LineChart({
    points,
    color,
    height = 140,
}: {
    points: Array<{ label: string; value: number }>;
    color: string;
    height?: number;
}) {
    if (!points.length) return <p className="text-xs text-neutral-500">No data.</p>;
    const W = 600;
    const H = height;
    const pad = { top: 8, right: 8, bottom: 16, left: 32 };
    const max = Math.max(1, ...points.map(p => p.value));
    const stepX = (W - pad.left - pad.right) / Math.max(1, points.length - 1);
    const path = points
        .map((p, i) => {
            const x = pad.left + i * stepX;
            const y = H - pad.bottom - (p.value / max) * (H - pad.top - pad.bottom);
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    const areaPath = `${path} L${pad.left + (points.length - 1) * stepX},${H - pad.bottom} L${pad.left},${H - pad.bottom} Z`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
            {/* gridlines */}
            {[0.25, 0.5, 0.75, 1].map(f => {
                const y = H - pad.bottom - f * (H - pad.top - pad.bottom);
                return <line key={f} x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="#262626" strokeDasharray="2 3" />;
            })}
            <path d={areaPath} fill={color} fillOpacity={0.1} />
            <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
            {/* y-axis: 0 + max */}
            <text x={4} y={H - pad.bottom + 4} fontSize="9" fill="#525252">0</text>
            <text x={4} y={pad.top + 8} fontSize="9" fill="#525252">{Math.round(max).toLocaleString()}</text>
            {/* x-axis: first + last labels */}
            <text x={pad.left} y={H - 2} fontSize="9" fill="#525252">{points[0].label}</text>
            <text x={W - pad.right} y={H - 2} fontSize="9" fill="#525252" textAnchor="end">{points[points.length - 1].label}</text>
        </svg>
    );
}
