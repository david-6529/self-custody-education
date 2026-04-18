import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 5,
});

export default pool;

export async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prompt_submissions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      token_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      x_handle TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      category TEXT,
      generations INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Add columns if table already exists without them
  await pool.query(`ALTER TABLE prompt_submissions ADD COLUMN IF NOT EXISTS generations INTEGER NOT NULL DEFAULT 0`).catch(() => {});
  await pool.query(`ALTER TABLE prompt_submissions ADD COLUMN IF NOT EXISTS more_details TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE prompt_submissions ADD COLUMN IF NOT EXISTS ref_images TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE prompt_submissions ADD COLUMN IF NOT EXISTS requires_ref_images BOOLEAN DEFAULT false`).catch(() => {});

  // Generation counts for built-in prompts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prompt_generations (
      prompt_id TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    )
  `);


  // Categories table for custom categories
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prompt_categories (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Brand assets library
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

  // Rate-limit log for public submission POSTs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submission_rate_log (
      id BIGSERIAL PRIMARY KEY,
      ip TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_submission_rate_log_ip_created
     ON submission_rate_log (ip, created_at DESC)`
  );

  // Brand asset categories
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brand_categories (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Seed brand categories if empty
  const { rows: bcRows } = await pool.query("SELECT COUNT(*) as cnt FROM brand_categories");
  if (parseInt(bcRows[0].cnt) === 0) {
    await pool.query(`
      INSERT INTO brand_categories (slug, label) VALUES
        ('gifs', 'GIFs'),
        ('backgrounds', 'Backgrounds'),
        ('characters', 'Characters'),
        ('scenes', 'Scenes'),
        ('tposes', 'T-Poses'),
        ('logos', 'Logos & Icons'),
        ('textures', 'Textures & Patterns')
      ON CONFLICT DO NOTHING
    `);
  }

  // Seed default categories if empty
  const { rows } = await pool.query("SELECT COUNT(*) as cnt FROM prompt_categories");
  if (parseInt(rows[0].cnt) === 0) {
    await pool.query(`
      INSERT INTO prompt_categories (slug, label) VALUES
        ('foundational', 'Foundational'),
        ('scene', 'Scenes'),
        ('profile', 'Profile Pics'),
        ('cinematic', 'Cinematic'),
        ('artistic', 'Artistic'),
        ('meme', 'Memes and Fun')
      ON CONFLICT DO NOTHING
    `);
  }
}
