const { analyzeWriting } = require('./analysis');

function hasAiConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 5;
  return Math.min(9, Math.max(0, Math.round(score * 2) / 2));
}

function normalizeFeedback(feedback, input) {
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
    provider: 'openai',
    generatedAt: new Date().toISOString()
  };
}

async function analyzeWithAI(input) {
  if (!hasAiConfig()) {
    return { ...analyzeWriting(input), provider: 'heuristic' };
  }

  try {
    return await requestAiScore(input);
  } catch (error) {
    console.error('AI scoring unavailable, using heuristic fallback:', error.message);
    return { ...analyzeWriting(input), provider: 'heuristic-fallback' };
  }
}

async function requestAiScore(input) {

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = `You are an experienced IELTS Writing examiner. Assess the response using the official four criteria: Task Achievement/Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. Be conservative: do not award a high band for length, paragraph count, or linking words alone. Return only valid JSON with this shape: {"overall": number, "criteria": {"taskAchievement": number, "coherence": number, "lexical": number, "grammar": number}, "strengths": [string], "improvements": [string], "summary": string, "revisedEssay": string}. Scores must use IELTS half bands from 0 to 9. Task type: ${input.taskType}. Prompt: ${input.topic}. Student response: ${input.answer}`;

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
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

  return normalizeFeedback(JSON.parse(content), input);
}

module.exports = {
  analyzeWithAI
};
