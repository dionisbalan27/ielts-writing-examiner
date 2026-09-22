const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.');
}

const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_name TEXT NOT NULL,
      task_type TEXT NOT NULL,
      topic TEXT NOT NULL,
      answer TEXT NOT NULL,
      file_name TEXT,
      target_band NUMERIC(2, 1) NOT NULL DEFAULT 7,
      feedback JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS reports_user_created_idx
      ON reports (user_id, created_at DESC);
  `);

  const passwordHash = await bcrypt.hash('admin123', 12);
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    ['user_demo_admin', 'Admin Demo', 'admin@ielts.com', passwordHash]
  );
}

module.exports = {
  pool,
  initializeDatabase
};
