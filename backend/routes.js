const express = require('express');
const { readStore, writeStore } = require('./dataStore');
const { validateRegister, validateLogin } = require('./validators');
const { analyzeWriting } = require('./analysis');

const router = express.Router();

function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'IELTS API is running' });
});

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  const validationError = validateRegister({ name, email, password });

  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const store = readStore();
  const existing = store.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase());

  if (existing) {
    return res.status(409).json({ success: false, message: 'User already exists.' });
  }

  const newUser = {
    id: generateId('user'),
    name,
    email,
    password,
    createdAt: new Date().toISOString()
  };

  store.users.push(newUser);
  writeStore(store);

  res.status(201).json({
    success: true,
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const validationError = validateLogin({ email, password });

  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const store = readStore();
  const user = store.users.find(
    (item) => item.email.toLowerCase() === String(email).toLowerCase() && item.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

router.post('/analyze', (req, res) => {
  const { userId, taskType, topic, answer, targetBand, fileName } = req.body || {};

  if (!userId || !taskType || !topic || !answer) {
    return res.status(400).json({ success: false, message: 'User, task type, topic, and answer are required.' });
  }

  const store = readStore();
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const feedback = analyzeWriting({ taskType, topic, answer, targetBand });
  const report = {
    id: generateId('report'),
    userId,
    userName: user.name,
    taskType,
    topic,
    answer,
    fileName: fileName || null,
    targetBand: Number(targetBand || 7),
    feedback,
    createdAt: new Date().toISOString()
  };

  store.reports.unshift(report);
  writeStore(store);

  res.status(201).json({ success: true, report });
});

router.get('/history', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required.' });
  }

  const store = readStore();
  const reports = store.reports
    .filter((report) => report.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, reports });
});

router.get('/report/:id', (req, res) => {
  const { id } = req.params;
  const store = readStore();
  const report = store.reports.find((item) => item.id === id);

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  res.json({ success: true, report });
});

module.exports = router;
