const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('./database');
const { validateRegister, validateLogin } = require('./validators');
const { analyzeWriting } = require('./analysis');
const { createToken, requireAuth } = require('./auth');

const router = express.Router();

function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'IELTS API is running', database: 'postgresql' });
  } catch (error) {
    res.status(503).json({ success: false, message: 'Database unavailable.' });
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    const validationError = validateRegister({ name, email, password });
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const user = {
      id: generateId('user'),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12)
    };
    const result = await pool.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, created_at`,
      [user.id, user.name, user.email, user.passwordHash]
    );
    const createdUser = result.rows[0];
    res.status(201).json({ success: true, user: publicUser(createdUser), token: createToken(createdUser) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'User already exists.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const validationError = validateLogin({ email, password });
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [String(email).trim().toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    res.json({ success: true, user: publicUser(user), token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/analyze', requireAuth, async (req, res, next) => {
  try {
    const { taskType, topic, answer, targetBand, fileName } = req.body || {};
    if (!taskType || !topic || !answer) {
      return res.status(400).json({ success: false, message: 'Task type, topic, and answer are required.' });
    }
    const userResult = await pool.query('SELECT id, name FROM users WHERE id = $1', [req.auth.sub]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const feedback = analyzeWriting({ taskType, topic, answer, targetBand });
    const result = await pool.query(
      `INSERT INTO reports
       (id, user_id, user_name, task_type, topic, answer, file_name, target_band, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, user_id AS "userId", user_name AS "userName", task_type AS "taskType", topic, answer, file_name AS "fileName", target_band AS "targetBand", feedback, created_at AS "createdAt"`,
      [generateId('report'), user.id, user.name, taskType, topic, answer, fileName || null, Number(targetBand || 7), feedback]
    );
    res.status(201).json({ success: true, report: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id AS "userId", user_name AS "userName", task_type AS "taskType", topic, answer, file_name AS "fileName", target_band AS "targetBand", feedback, created_at AS "createdAt"
       FROM reports WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.auth.sub]
    );
    res.json({ success: true, reports: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/report/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id AS "userId", user_name AS "userName", task_type AS "taskType", topic, answer, file_name AS "fileName", target_band AS "targetBand", feedback, created_at AS "createdAt"
       FROM reports WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.auth.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Report not found.' });
    res.json({ success: true, report: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

module.exports = router;
