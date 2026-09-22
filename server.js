const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let data = { users: [], reports: [] };

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
      if (raw) {
        data = JSON.parse(raw);
      }
    } catch (error) {
      data = { users: [], reports: [] };
    }
  }

  if (!Array.isArray(data.users) || data.users.length === 0) {
    data.users = [
      {
        id: 'user_demo_admin',
        name: 'Admin Demo',
        email: 'admin@ielts.com',
        password: 'admin123',
        createdAt: new Date().toISOString()
      }
    ];
    data.reports = Array.isArray(data.reports) ? data.reports : [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }
}

function readStore() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeStore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function countWords(text = '') {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function buildRevisedEssay(taskType, answer) {
  const base = answer && answer.trim() ? answer.trim() : 'Education is essential for personal and national progress.';

  if (taskType === 'task2') {
    return 'In my opinion, technology has greatly improved the way people learn and communicate. It offers students quick access to information and allows them to develop skills beyond traditional classroom settings. However, excessive dependence on technology may weaken critical thinking and reduce face-to-face interaction. For this reason, schools should encourage balanced use and teach digital literacy alongside conventional learning methods. Overall, technology should be used as a supportive tool, not a replacement for effective education.';
  }

  if (taskType === 'task1_academic') {
    return 'The chart demonstrates a clear upward trend in internet usage over the given period. Overall, the data shows a significant increase across all age groups, particularly among older adults. In the early years, access was relatively limited, but the percentage rose steadily as technology became more affordable and widely available. By the end of the period, usage had increased substantially, suggesting that digital tools are now more important in everyday life and work.';
  }

  return 'Dear Manager,\n\nI am writing to express my concern about the service I received during my recent stay. Although the location was convenient, I was disappointed by the cleanliness and the slow response to my requests. I hope you will take my feedback seriously and make improvements in the future. Thank you for your time and consideration.';
}

function buildAiFeedback({ taskType, topic, answer, targetBand }) {
  const words = countWords(answer);
  const sentences = answer.split(/[.!?]+/).filter(Boolean).map((s) => s.trim()).filter(Boolean);
  const avgSentenceLength = sentences.length
    ? sentences.reduce((sum, s) => sum + countWords(s), 0) / sentences.length
    : 0;

  let taskAchievement = 5.6;
  let coherence = 5.2;
  let lexical = 5.8;
  let grammar = 5.4;

  if (words >= 180) taskAchievement += 0.5;
  if (words >= 220) taskAchievement += 0.5;
  if (avgSentenceLength > 18) coherence += 0.6;
  if (/however|therefore|moreover|in contrast|for example|in addition/i.test(answer)) lexical += 0.7;
  if (/[.!?]/.test(answer) && /,/.test(answer)) grammar += 0.7;

  const criteria = {
    taskAchievement: Number(Math.min(9, taskAchievement).toFixed(1)),
    coherence: Number(Math.min(9, coherence).toFixed(1)),
    lexical: Number(Math.min(9, lexical).toFixed(1)),
    grammar: Number(Math.min(9, grammar).toFixed(1))
  };

  const overall = Number(
    (
      (criteria.taskAchievement + criteria.coherence + criteria.lexical + criteria.grammar) /
      4
    ).toFixed(1)
  );

  const strengths = [];
  const improvements = [];

  if (criteria.taskAchievement >= 6) strengths.push('You addressed the main issue and kept a clear focus on the task.');
  else improvements.push('Expand your main idea with more precise supporting examples.');

  if (criteria.coherence >= 6) strengths.push('Your ideas are generally organized in a logical sequence.');
  else improvements.push('Use stronger linking phrases to improve paragraph flow.');

  if (criteria.lexical >= 6) strengths.push('Your vocabulary is appropriate and mostly varied for academic writing.');
  else improvements.push('Increase academic vocabulary and try more precise word choices.');

  if (criteria.grammar >= 6) strengths.push('Several sentences are grammatically accurate and easy to understand.');
  else improvements.push('Reduce run-on sentences and punctuation mistakes to improve clarity.');

  const targetValue = Number(targetBand || 7);
  const gap = Number((targetValue - overall).toFixed(1));

  return {
    taskType,
    topic,
    wordCount: words,
    overall,
    targetBand: targetValue,
    gap,
    criteria,
    strengths,
    improvements,
    summary: `Your writing is close to a ${overall} level. To reach band ${targetValue}, focus on improving sentence control, clearer paragraphing, and more varied academic vocabulary.`,
    revisedEssay: buildRevisedEssay(taskType, answer),
    generatedAt: new Date().toISOString()
  };
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'IELTS API is running' });
});

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  const store = readStore();
  const existingUser = store.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase());

  if (existingUser) {
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

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
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

app.post('/api/analyze', (req, res) => {
  const { userId, taskType, topic, answer, targetBand, fileName } = req.body || {};

  if (!userId || !taskType || !topic || !answer) {
    return res.status(400).json({ success: false, message: 'User, task type, topic, and answer are required.' });
  }

  const store = readStore();
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const feedback = buildAiFeedback({ taskType, topic, answer, targetBand });
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

app.get('/api/history', (req, res) => {
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

app.get('/api/report/:id', (req, res) => {
  const { id } = req.params;
  const store = readStore();
  const report = store.reports.find((item) => item.id === id);

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  res.json({ success: true, report });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`IELTS app running on http://localhost:${PORT}`);
});
