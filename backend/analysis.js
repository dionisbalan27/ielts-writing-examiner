function countWords(text = '') {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  function roundBand(value) {
    return Math.min(9, Math.max(0, Math.round(value * 2) / 2));
  }

  function uniqueWordRatio(text) {
    const words = text.toLowerCase().match(/[a-z']+/g) || [];
    return words.length ? new Set(words).size / words.length : 0;
  }

  function contentWords(text) {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is',
      'it', 'of', 'on', 'or', 'that', 'the', 'their', 'this', 'to', 'was', 'were',
      'which', 'with', 'you', 'your'
    ]);
    return (text.toLowerCase().match(/[a-z']+/g) || []).filter((word) => word.length > 3 && !stopWords.has(word));
  }

  function topicCoverage(topic, answer) {
    const topicTerms = new Set(contentWords(topic));
    const answerTerms = new Set(contentWords(answer));
    if (!topicTerms.size) return 0.5;
    return [...topicTerms].filter((term) => answerTerms.has(term)).length / topicTerms.size;
  }

  function errorSignals(answer) {
    return [
      /\bi (?:is|are|be)\b/gi,
      /\bpeople is\b/gi,
      /\b(it|this|that) are\b/gi,
      /\b(he|she|it) have\b/gi,
      /\bmore better\b/gi,
      /\b(very|really) very\b/gi,
      /\s{2,}/g,
      /[!?.,]{2,}/g
    ].reduce((total, pattern) => total + (answer.match(pattern) || []).length, 0);
  }

  function paragraphCount(text) {
    return text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean).length;
  }

  function buildRevisedEssay(taskType) {
    if (taskType === 'task2') {
      return 'In my opinion, technology has significantly transformed the way people learn and communicate. It allows learners to access information quickly and improve their understanding in a more efficient way. However, excessive use of technology may weaken interpersonal skills and reduce critical thinking. Therefore, schools should encourage balanced use and teach students digital literacy alongside traditional learning methods. Overall, technology should be seen as a support tool, not a replacement for meaningful education.';
    }

    if (taskType === 'task1_academic') {
      return 'The chart illustrates a clear upward trend in digital usage over the period shown. Overall, the data reveals a significant increase across most groups, especially among older age categories. Although usage was initially limited, it rose steadily as access improved and technology became more affordable. By the end of the period, internet usage had reached a much higher level, indicating a strong shift toward digital dependence in everyday life.';
    }

    return 'Dear Manager,\n\nI am writing to express my concern about the service I recently received during my stay. Although the location was convenient, I was disappointed by the cleanliness and the slow response to my request. I hope you will take my comments seriously and make improvements to ensure a better experience for future guests. Thank you for your time and consideration.';
  }

  function analyzeWriting({ taskType, topic, answer, targetBand }) {
    const words = countWords(answer);
    const sentences = answer.split(/[.!?]+/).filter(Boolean).map((sentence) => sentence.trim()).filter(Boolean);
    const paragraphs = paragraphCount(answer);
    const avgSentenceLength = sentences.length
      ? sentences.reduce((sum, sentence) => sum + countWords(sentence), 0) / sentences.length
      : 0;
    const taskMinimum = taskType === 'task2' ? 250 : 150;
    const coverage = topicCoverage(topic, answer);
    const connectors = (answer.match(/\b(however|therefore|moreover|furthermore|consequently|for example|for instance|in contrast|in addition|overall|although|while)\b/gi) || []).length;
    const complexMarkers = (answer.match(/\b(although|because|which|whereas|despite|unless|if|while|since)\b/gi) || []).length;
    const punctuationSignals = (answer.match(/[,;:]/g) || []).length;
    const diversity = uniqueWordRatio(answer);
    const errors = errorSignals(answer);

    let taskAchievement = 4.5;
    if (words >= taskMinimum) taskAchievement += 2;
    else if (words >= taskMinimum * 0.8) taskAchievement += 1;
    else taskAchievement -= Math.min(1.5, (taskMinimum - words) / taskMinimum * 1.5);
    if (words >= taskMinimum * 1.15) taskAchievement += 0.7;
    if (paragraphs >= 4) taskAchievement += 1;
    else if (paragraphs >= 3) taskAchievement += 0.6;
    if (coverage >= 0.5) taskAchievement += 0.8;
    else if (coverage < 0.2) taskAchievement -= 1;

    let coherence = 4.5;
    if (paragraphs >= 4) coherence += 1.4;
    else if (paragraphs >= 3) coherence += 0.8;
    coherence += Math.min(1.6, connectors * 0.25);
    if (sentences.length >= 8 && avgSentenceLength >= 14 && avgSentenceLength <= 28) coherence += 0.7;
    if (errors >= 3) coherence -= Math.min(1.2, errors * 0.2);

    let lexical = 4.5;
    if (diversity >= 0.62) lexical += 1.2;
    else if (diversity >= 0.52) lexical += 0.7;
    if (connectors >= 4) lexical += 0.7;
    if (words >= taskMinimum && complexMarkers >= 4) lexical += 0.8;
    if (errors >= 2) lexical -= Math.min(1, errors * 0.15);

    let grammar = 4.5;
    if (sentences.length >= 8) grammar += 1;
    if (complexMarkers >= 3) grammar += 1;
    if (punctuationSignals >= 6) grammar += 0.7;
    if (/[.!?]/.test(answer) && /,/.test(answer)) grammar += 0.5;
    grammar -= Math.min(2, errors * 0.35);

    const qualityBoost = words >= taskMinimum && paragraphs >= 4 && diversity >= 0.58 && connectors >= 3 ? 0.4 : 0;
    const criteria = {
      taskAchievement: roundBand(taskAchievement),
      coherence: roundBand(coherence + qualityBoost),
      lexical: roundBand(lexical + qualityBoost),
      grammar: roundBand(grammar + qualityBoost)
    };
    const overall = roundBand(
      (criteria.taskAchievement + criteria.coherence + criteria.lexical + criteria.grammar) / 4
    );

    const strengths = [];
    const improvements = [];

    if (criteria.taskAchievement >= 7) strengths.push('You address the main task and keep a clear focus on the topic.');
    else improvements.push('Expand your main idea with more direct supporting examples.');
    if (criteria.coherence >= 7) strengths.push('Your ideas are generally organised in a logical order.');
    else improvements.push('Improve paragraph flow with stronger linking phrases and clearer transitions.');
    if (criteria.lexical >= 7) strengths.push('Your vocabulary is generally appropriate for an academic response.');
    else improvements.push('Use more precise academic vocabulary and reduce repetition.');
    if (criteria.grammar >= 7) strengths.push('Several sentences are clear and grammatically controlled.');
    else improvements.push('Reduce sentence fragments, run-ons, and punctuation errors to improve clarity.');

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
      summary: `Your writing is currently around band ${overall}. To reach band ${targetValue}, focus on sentence control, better cohesion, and more precise academic vocabulary.`,
      revisedEssay: buildRevisedEssay(taskType),
      generatedAt: new Date().toISOString()
    };
  }

  module.exports = {
    analyzeWriting
  };
