require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { pool, initializeDatabase } = require('./database');
const { readStore } = require('./dataStore');

async function migrate() {
  await initializeDatabase();
  const store = readStore();

  for (const user of store.users || []) {
    const passwordHash = user.passwordHash || await bcrypt.hash(user.password || 'change-me', 12);
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [user.id, user.name, user.email.toLowerCase(), passwordHash, user.createdAt || new Date()]
    );
  }

  for (const report of store.reports || []) {
    await pool.query(
      `INSERT INTO reports
       (id, user_id, user_name, task_type, topic, answer, file_name, target_band, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        report.id,
        report.userId,
        report.userName,
        report.taskType,
        report.topic,
        report.answer,
        report.fileName || null,
        Number(report.targetBand || 7),
        report.feedback,
        report.createdAt || new Date()
      ]
    );
  }

  console.log(`Migrated ${store.users?.length || 0} users and ${store.reports?.length || 0} reports.`);
}

migrate()
  .catch((error) => {
    console.error('JSON migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
