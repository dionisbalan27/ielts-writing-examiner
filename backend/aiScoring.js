const { analyzeWriting } = require('./analysis');

function hasOllamaConfig() {
  return process.env.OLLAMA_ENABLED === 'true';
}

function hasGeminiConfig() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function hasOpenAiConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 5;
  return Math.min(9, Math.max(0, Math.round(score * 2) / 2));
}

function normalizeFeedback(feedback, input, provider) {
  const criteria = feedback.criteria || {};
  const normalizedCriteria = {
    taskAchievement: normalizeScore(criteria.taskAchievement),
    coherence: normalizeScore(criteria.coherence),
    lexical: normalizeScore(criteria.lexical),
    grammar: normalizeScore(criteria.grammar)
  };
  const overall = normalizeScore(
    feedback.overall || Object.values(normalizedCriteria).reduce((sum, score) => sum + score, 0) / 4
  );

  return {
    taskType: input.taskType,
    topic: input.topic,
    wordCount: input.answer.trim().split(/\s+/).length,
    overall,
    targetBand: Number(input.targetBand || 7),
    gap: Number((Number(input.targetBand || 7) - overall).toFixed(1)),
    criteria: normalizedCriteria,
    strengths: Array.isArray(feedback.strengths) ? feedback.strengths.slice(0, 5) : [],
    improvements: Array.isArray(feedback.improvements) ? feedback.improvements.slice(0, 8) : [],
    summary: String(feedback.summary || 'Review the criterion scores and improvement points below.'),
    revisedEssay: String(feedback.revisedEssay || ''),
    provider,
    generatedAt: new Date().toISOString()
  };
}

async function analyzeWithAI(input) {
  try {
    if (hasGeminiConfig()) return await requestGeminiScore(input);
    if (hasOllamaConfig()) return await requestOllamaScore(input);
    if (hasOpenAiConfig()) return await requestOpenAiScore(input);
    return { ...analyzeWriting(input), provider: 'heuristic' };
  } catch (error) {
    console.error('AI scoring unavailable, using heuristic fallback:', error.message);
    return { ...analyzeWriting(input), provider: 'heuristic-fallback' };
  }
}

async function requestGeminiScore(input) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 20000)),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You are an experienced IELTS Writing examiner. Return only valid JSON.' }] },
      contents: [{ parts: [{ text: buildPrompt(input) }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}.`);
  const payload = await response.json();
  const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Gemini returned an empty response.');
  return normalizeFeedback(JSON.parse(content), input, 'gemini-free');
}

function buildPrompt(input) {
  return `You are an experienced IELTS Writing examiner. Assess the response using the official four criteria: Task Achievement/Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. Be conservative: do not award a high band for length, paragraph count, or linking words alone. Return only valid JSON with this shape: {"overall": number, "criteria": {"taskAchievement": number, "coherence": number, "lexical": number, "grammar": number}, "strengths": [string], "improvements": [string], "summary": string, "revisedEssay": string}. Scores must use IELTS half bands from 0 to 9. Task type: ${input.taskType}. Prompt: ${input.topic}. Student response: ${input.answer}`;
}

async function requestOpenAiScore(input) {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = buildPrompt(input);

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 20000)),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return only the requested JSON object.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI scoring request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI scoring returned an empty response.');

  return normalizeFeedback(JSON.parse(content), input, 'openai');
}

async function requestOllamaScore(input) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 60000)),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      options: { temperature: 0.1 },
      messages: [
        { role: 'system', content: 'Return only the requested JSON object.' },
        { role: 'user', content: buildPrompt(input) }
      ]
    })
  });

  if (!response.ok) throw new Error(`Ollama request failed with status ${response.status}.`);
  const payload = await response.json();
  const content = payload.message?.content;
  if (!content) throw new Error('Ollama returned an empty response.');
  return normalizeFeedback(JSON.parse(content), input, 'ollama');
}

module.exports = {
  analyzeWithAI
};
