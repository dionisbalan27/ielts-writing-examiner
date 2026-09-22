const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'store.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      users: [
        {
          id: 'user_demo_admin',
          name: 'Admin Demo',
          email: 'admin@ielts.com',
          password: 'admin123',
          createdAt: new Date().toISOString()
        }
      ],
      reports: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
  }
}

function readStore() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  if (!raw.trim()) {
    const fresh = { users: [], reports: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const fresh = { users: [], reports: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

function writeStore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  DATA_FILE,
  ensureDataFile,
  readStore,
  writeStore
};
