import { useEffect, useMemo, useState } from 'react';

const tasks = [
  { id: 'task1_academic', label: 'Task 1', detail: 'Academic' },
  { id: 'task1_general', label: 'Task 1', detail: 'General' },
  { id: 'task2', label: 'Task 2', detail: 'Essay' }
];

const emptyForm = { topic: '', answer: '', targetBand: '7', fileName: '' };

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function App() {
  const [screen, setScreen] = useState('auth');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authMessage, setAuthMessage] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [task, setTask] = useState('task1_academic');
  const [form, setForm] = useState(emptyForm);
  const [history, setHistory] = useState([]);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  const wordCount = useMemo(() => countWords(form.answer), [form.answer]);

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(path, { ...options, headers });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Request failed.');
    return result;
  }

  async function loadHistory(activeToken = token) {
    if (!activeToken) return;
    const response = await fetch('/api/history', { headers: { Authorization: `Bearer ${activeToken}` } });
    const result = await response.json();
    if (response.ok) setHistory(result.reports || []);
  }

  function updateAuth(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }));
  }

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setAuthMessage('');
    try {
      const result = await fetch(`/api/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.message || 'Authentication failed.');
      if (authMode === 'register') {
        setAuthMode('login');
        setAuthForm({ name: '', email: authForm.email, password: '' });
        setAuthMessage('Registration successful. Please log in.');
      } else {
        setUser(data.user);
        setToken(data.token);
        setAuthForm({ name: '', email: '', password: '' });
        await loadHistory(data.token);
        setScreen('dashboard');
      }
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function useDemo() {
    setAuthMode('login');
    setAuthForm({ name: '', email: 'admin@ielts.com', password: 'admin123' });
  }

  function logout() {
    setUser(null);
    setToken('');
    setHistory([]);
    setReport(null);
    setScreen('auth');
  }

  async function analyze() {
    if (!form.topic.trim() || !form.answer.trim()) {
      setAuthMessage('');
      window.alert('Please enter the writing prompt and your response.');
      return;
    }
    setBusy(true);
    try {
      const result = await api('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, taskType: task, topic: form.topic.trim(), answer: form.answer.trim() })
      });
      setReport(result.report);
      await loadHistory();
      setScreen('result');
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (screen === 'dashboard' && user) loadHistory();
  }, [screen, user]);

  if (screen === 'auth') {
    return (
      <main className="auth-shell">
        <section className="auth-intro">
          <div className="brand"><span className="brand-mark">W</span> IELTS Writing Examiner</div>
          <div className="intro-copy">
            <p className="eyebrow">Writing assessment studio</p>
            <h1>Make every draft a clearer argument.</h1>
            <p className="intro-text">Practice with structured feedback across the IELTS writing criteria, then turn observations into a stronger next version.</p>
            <div className="feature-list"><span>01 <b>Criterion scoring</b></span><span>02 <b>Actionable feedback</b></span><span>03 <b>Progress history</b></span></div>
          </div>
        </section>
        <section className="auth-card">
          <div className="auth-tabs"><button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button><button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Register</button></div>
          <form onSubmit={submitAuth}>
            <p className="eyebrow">{authMode === 'login' ? 'Welcome back' : 'Start practicing'}</p>
            <h2>{authMode === 'login' ? 'Enter your workspace' : 'Create your account'}</h2>
            {authMode === 'register' && <label>Full name<input value={authForm.name} onChange={(event) => updateAuth('name', event.target.value)} placeholder="Your name" required /></label>}
            <label>Email<input type="email" value={authForm.email} onChange={(event) => updateAuth('email', event.target.value)} placeholder="you@example.com" required /></label>
            <label>Password<input type="password" value={authForm.password} onChange={(event) => updateAuth('password', event.target.value)} placeholder="Minimum 6 characters" required /></label>
            {authMode === 'login' && <button type="button" className="ghost-button" onClick={useDemo}>Use demo account</button>}
            <button className="primary-button" disabled={busy}>{busy ? 'Working...' : authMode === 'login' ? 'Open workspace' : 'Create account'}</button>
          </form>
          {authMode === 'login' && <div className="demo-note">Demo: admin@ielts.com / admin123</div>}
          {authMessage && <p className="form-message">{authMessage}</p>}
        </section>
      </main>
    );
  }

  if (screen === 'result' && report) {
    const feedback = report.feedback;
    return <main className="app-shell"><Header user={user} onLogout={logout} action={<button className="ghost-button" onClick={() => setScreen('dashboard')}>Back to workspace</button>} />
      <div className="result-grid"><section className="paper-panel"><p className="eyebrow">Submitted prompt</p><div className="reading-box">{report.topic}</div><p className="eyebrow">Student response</p><div className="reading-box response-box">{report.answer}</div></section>
        <section className="score-panel"><div className="score-top"><div><p className="eyebrow">Overall band</p><strong className="big-score">{feedback.overall}</strong></div><div className="target-pill">Target <b>{report.targetBand}</b></div></div><div className="criteria-grid">{[['Task response', 'taskAchievement'], ['Coherence', 'coherence'], ['Lexical resource', 'lexical'], ['Grammar', 'grammar']].map(([label, key]) => <div className="criterion" key={key}><span>{label}</span><b>{feedback.criteria[key]}</b></div>)}</div><Feedback title="Strengths" items={feedback.strengths} tone="green" /><Feedback title="Areas to improve" items={feedback.improvements} tone="amber" /><div className="feedback-block blue"><h3>Examiner summary</h3><p>{feedback.summary}</p></div><div className="feedback-block lavender"><h3>Suggested revision</h3><p>{feedback.revisedEssay}</p></div></section></div></main>;
  }

  return <main className="app-shell"><Header user={user} onLogout={logout} /><div className="workspace-grid"><section className="workspace-panel"><div className="section-heading"><div><p className="eyebrow">Writing workspace</p><h2>Submit a response</h2></div><span className="status-dot">PostgreSQL connected</span></div><div className="task-selector">{tasks.map((item) => <button className={task === item.id ? 'selected' : ''} key={item.id} onClick={() => setTask(item.id)}><b>{item.label}</b><span>{item.detail}</span></button>)}</div><label>Question prompt<textarea value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} rows="3" placeholder="Paste the IELTS writing prompt here..." /></label><label>Your response<textarea className="essay-input" value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} rows="14" placeholder="Write your response here..." /></label><div className="form-footer"><label>Target band<select value={form.targetBand} onChange={(event) => setForm({ ...form, targetBand: event.target.value })}>{[6, 6.5, 7, 7.5, 8, 8.5, 9].map((value) => <option key={value}>{value}</option>)}</select></label><div className="word-meter"><b>{wordCount}</b><span>words</span></div><button className="primary-button analyze-button" onClick={analyze} disabled={busy}>{busy ? 'Examining...' : 'Analyze response'}</button></div></section><aside className="history-panel"><div className="section-heading"><div><p className="eyebrow">Your archive</p><h2>History</h2></div><span className="history-count">{history.length}</span></div>{history.length ? history.map((item) => <button className="history-item" key={item.id} onClick={() => { setReport(item); setScreen('result'); }}><b>{item.taskType.replace('_', ' ')}</b><span>{new Date(item.createdAt).toLocaleDateString()} · band {item.feedback.overall}</span></button>) : <p className="empty-state">Your analyzed responses will appear here.</p>}</aside></div></main>;
}

function Header({ user, onLogout, action }) {
  return <header className="topbar"><div className="brand"><span className="brand-mark">W</span> IELTS Writing Examiner</div><div className="topbar-actions">{action}<span className="user-name">{user?.name}</span><button className="text-button" onClick={onLogout}>Log out</button></div></header>;
}

function Feedback({ title, items, tone }) {
  return <div className={`feedback-block ${tone}`}><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

export default App;
