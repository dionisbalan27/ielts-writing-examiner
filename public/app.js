const state = {
  selectedTask: 'task1_academic',
  currentUser: null,
  report: null,
  history: []
};

const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const resultScreen = document.getElementById('result-screen');

const authMessage = document.getElementById('auth-message');
const userNameDisplay = document.getElementById('user-name');
const historyList = document.getElementById('history-list');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabButtons = document.querySelectorAll('.tab-btn');
const taskCards = document.querySelectorAll('.task-card');

function showScreen(screen) {
  authScreen.classList.remove('active');
  dashboardScreen.classList.remove('active');
  resultScreen.classList.remove('active');
  screen.classList.add('active');
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? '#dc2626' : '#2563eb';
}

function toggleAuthForms(tab) {
  document.querySelectorAll('.auth-form').forEach((form) => form.classList.remove('active'));
  tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.getElementById(`${tab}-form`).classList.add('active');
}

function countWords(text = '') {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function renderHistory() {
  if (!state.currentUser) {
    historyList.innerHTML = '<p class="empty-state">Login first to view history.</p>';
    return;
  }

  if (!state.history.length) {
    historyList.innerHTML = '<p class="empty-state">No reports yet.</p>';
    return;
  }

  historyList.innerHTML = state.history
    .map(
      (report) => `
        <div class="history-item" data-id="${report.id}">
          <strong>${report.taskType}</strong>
          <small>${new Date(report.createdAt).toLocaleDateString()} · ${report.feedback.overall} band</small>
        </div>
      `
    )
    .join('');

  historyList.querySelectorAll('.history-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const report = state.history.find((entry) => entry.id === item.dataset.id);
      if (!report) return;
      renderReport(report.feedback, report.topic, report.answer, report.targetBand);
      showScreen(resultScreen);
    });
  });
}

async function loadHistory() {
  if (!state.currentUser) return;

  try {
    const response = await fetch(`/api/history?userId=${state.currentUser.id}`);
    const result = await response.json();
    state.history = result.success ? result.reports : [];
    renderHistory();
  } catch (error) {
    state.history = [];
    renderHistory();
  }
}

function renderReport(feedback, topic, answer, targetBand) {
  document.getElementById('result-topic').textContent = topic || 'No topic provided.';
  document.getElementById('result-answer').textContent = answer || 'No answer provided.';

  document.getElementById('overall-score').textContent = String(feedback.overall || 0);
  document.getElementById('target-score-display').textContent = String(targetBand || 7);
  document.getElementById('task-achievement-score').textContent = String(feedback.criteria.taskAchievement);
  document.getElementById('coherence-score').textContent = String(feedback.criteria.coherence);
  document.getElementById('lexical-score').textContent = String(feedback.criteria.lexical);
  document.getElementById('grammar-score').textContent = String(feedback.criteria.grammar);

  document.getElementById('strengths-list').innerHTML = feedback.strengths
    .map((item) => `<li>${item}</li>`)
    .join('');

  document.getElementById('improvement-list').innerHTML = feedback.improvements
    .map((item) => `<li>${item}</li>`)
    .join('');

  document.getElementById('summary-text').textContent = feedback.summary;
  document.getElementById('revised-text').textContent = feedback.revisedEssay;
}

async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();

  if (!name || !email || !password) {
    setAuthMessage('Please fill in all registration fields.', true);
    return;
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const result = await response.json();

    if (!response.ok) {
      setAuthMessage(result.message || 'Registration failed.', true);
      return;
    }

    setAuthMessage('Registration successful. Please log in.');
    registerForm.reset();
    toggleAuthForms('login');
  } catch (error) {
    setAuthMessage('Registration failed. Please try again.', true);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email || !password) {
    setAuthMessage('Email and password are required.', true);
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!response.ok) {
      setAuthMessage(result.message || 'Login failed.', true);
      return;
    }

    state.currentUser = result.user;
    userNameDisplay.textContent = state.currentUser.name;
    setAuthMessage('');
    loginForm.reset();
    await loadHistory();
    showScreen(dashboardScreen);
  } catch (error) {
    setAuthMessage('Login failed. Please try again.', true);
  }
}

function handleLogout() {
  state.currentUser = null;
  state.history = [];
  renderHistory();
  showScreen(authScreen);
  loginForm.reset();
  registerForm.reset();
}

function updateWordCount() {
  const value = document.getElementById('answer-input').value;
  document.getElementById('word-count').textContent = countWords(value);
}

async function handleAnalyze() {
  if (!state.currentUser) {
    setAuthMessage('Please login before using the app.', true);
    showScreen(authScreen);
    return;
  }

  const topic = document.getElementById('topic-input').value.trim();
  const answer = document.getElementById('answer-input').value.trim();
  const targetBand = document.getElementById('target-band').value;

  if (!topic || !answer) {
    alert('Please enter the writing prompt and your response before analyzing.');
    return;
  }

  const payload = {
    userId: state.currentUser.id,
    taskType: state.selectedTask,
    topic,
    answer,
    targetBand,
    fileName: document.getElementById('file-input').value ? document.getElementById('file-input').files[0]?.name || 'uploaded-file' : null
  };

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message || 'Analysis failed.');
      return;
    }

    state.report = result.report;
    renderReport(result.report.feedback, result.report.topic, result.report.answer, result.report.targetBand);
    await loadHistory();
    showScreen(resultScreen);
  } catch (error) {
    alert('Something went wrong while processing your writing.');
  }
}

function demoLogin() {
  document.getElementById('login-email').value = 'admin@ielts.com';
  document.getElementById('login-password').value = 'admin123';
  handleLogin(new Event('submit'));
}

function bindEvents() {
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => toggleAuthForms(button.dataset.tab));
  });

  taskCards.forEach((card) => {
    card.addEventListener('click', () => {
      state.selectedTask = card.dataset.task;
      taskCards.forEach((task) => task.classList.toggle('active', task === card));
    });
  });

  document.getElementById('answer-input').addEventListener('input', updateWordCount);

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleLogin(event);
  });

  registerForm.addEventListener('submit', handleRegister);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('back-to-dashboard').addEventListener('click', () => showScreen(dashboardScreen));
  document.getElementById('analyze-btn').addEventListener('click', handleAnalyze);
  document.getElementById('demo-login-btn').addEventListener('click', demoLogin);
}

bindEvents();
showScreen(authScreen);
renderHistory();
