import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export default pool;

export async function ensureBrandTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brand_assets (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      filename TEXT NOT NULL,
      image_url TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Multi-category support (JSON array of slugs)
  await pool.query(`ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS categories TEXT`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS brand_categories (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const { rows } = await pool.query("SELECT COUNT(*) as cnt FROM brand_categories");
  if (parseInt(rows[0].cnt) === 0) {
    await pool.query(`
      INSERT INTO brand_categories (slug, label) VALUES
        ('gifs', 'GIFs'),
        ('backgrounds', 'Backgrounds'),
        ('characters', 'Characters'),
        ('scenes', 'Scenes'),
        ('tposes', 'T-Poses'),
        ('logos', 'Logos & Icons'),
        ('textures', 'Textures & Patterns'),
        ('badges', 'Badges')
      ON CONFLICT DO NOTHING
    `);
  }
}
