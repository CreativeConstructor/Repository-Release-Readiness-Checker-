const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../lib/config');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scoreFromCheckers(checkerResults) {
  const points = checkerResults.map((result) => {
    if (result.status === 'pass') return 20;
    if (result.status === 'warn') return 10;
    return 0;
  });
  return points.reduce((sum, value) => sum + value, 0);
}

function verdictFromScore(score) {
  if (score >= 80) return 'ready';
  if (score >= 50) return 'needs_work';
  return 'not_ready';
}

function buildFallbackReport({ checkerResults, summary, reason }) {
  const score = scoreFromCheckers(checkerResults);
  const verdict = verdictFromScore(score);

  const risks = checkerResults
    .filter((result) => result.status !== 'pass')
    .map((result) => ({
      title: result.name,
      detail: result.summary,
      severity: result.status === 'fail' ? 'high' : 'medium',
    }));

  const fixes = checkerResults.flatMap((result) =>
    result.findings
      .filter((finding) => finding.severity === 'fail' || finding.severity === 'warn')
      .map((finding) => ({
        action: finding.message,
        priority: finding.severity === 'fail' ? 'high' : 'medium',
        relatedChecker: result.id,
      }))
  );

  const baseSummary = `Rule-based score ${score}/100 (${summary.overall} across ${summary.checkerCount} checkers).`;
  const summaryText = reason ? `${baseSummary} ${reason}` : `${baseSummary} Set GOOGLE_API_KEY for a Gemini-written report.`;

  return {
    source: reason ? 'fallback_rate_limited' : 'fallback',
    score,
    verdict,
    summary: summaryText,
    risks: risks.slice(0, 8),
    fixes: fixes.slice(0, 10),
  };
}

function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

function normalizeReport(parsed) {
  const score = Math.max(0, Math.min(100, Number(parsed.score)));

  return {
    source: 'gemini',
    score: Number.isFinite(score) ? score : 0,
    verdict: parsed.verdict || verdictFromScore(score),
    summary: parsed.summary || 'No summary provided.',
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [],
  };
}

function isRateLimitError(err) {
  const message = err?.message || '';
  const status = err?.status || err?.statusCode;

  return (
    status === 429 ||
    /429|quota|rate.?limit|resource.?exhausted|too many requests/i.test(message)
  );
}

function isConfigError(err) {
  const message = err?.message || '';
  const status = err?.status || err?.statusCode;

  return status === 401 || status === 403 || /api key|API_KEY_INVALID|PERMISSION_DENIED/i.test(message);
}

function buildPrompt(repoUrl, snapshot, checkerResults, summary) {
  return `You are a senior DevOps engineer reviewing a GitHub repository before production release.

Repository: ${repoUrl}
Metadata: ${JSON.stringify(snapshot)}

Automated checker summary: ${JSON.stringify(summary)}

Checker results (JSON):
${JSON.stringify(checkerResults, null, 2)}

Write a release readiness report for a student/small team audience.
Return ONLY valid JSON (no markdown) with this exact shape:
{
  "score": <integer 0-100>,
  "verdict": "ready" | "needs_work" | "not_ready",
  "summary": "<2-3 sentences in plain English>",
  "risks": [
    { "title": "<short>", "detail": "<why it matters>", "severity": "high" | "medium" | "low" }
  ],
  "fixes": [
    { "action": "<specific actionable step>", "priority": "high" | "medium" | "low" }
  ]
}

Scoring guide:
- 80-100: ready with minor gaps
- 50-79: needs work before release
- below 50: not ready
Base the score on checker outcomes; be practical, not harsh.`;
}

async function callGemini(prompt) {
  const genAI = new GoogleGenerativeAI(config.googleApiKey);
  const model = genAI.getGenerativeModel({ model: config.googleModel });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  return text;
}

async function generateAiReport({ repoUrl, snapshot, checkerResults, summary }) {
  if (config.aiForceFallback || !config.googleApiKey) {
    return buildFallbackReport({ checkerResults, summary });
  }

  const prompt = buildPrompt(repoUrl, snapshot, checkerResults, summary);
  let lastError;

  for (let attempt = 1; attempt <= config.googleAiMaxRetries; attempt += 1) {
    try {
      const text = await callGemini(prompt);
      try {
        return normalizeReport(extractJson(text));
      } catch {
        return buildFallbackReport({
          checkerResults,
          summary,
          reason: 'Gemini response could not be parsed as JSON.',
        });
      }
    } catch (err) {
      lastError = err;

      if (isConfigError(err)) {
        throw err;
      }

      if (isRateLimitError(err) && config.googleAiFallbackOnRateLimit) {
        return buildFallbackReport({
          checkerResults,
          summary,
          reason:
            'Gemini rate limit/quota hit — used rule-based scoring so your check could still complete. Retry later or switch GOOGLE_MODEL to gemini-2.0-flash-lite.',
        });
      }

      if (attempt < config.googleAiMaxRetries) {
        const delayMs = config.googleAiRetryDelayMs * attempt;
        await sleep(delayMs);
      }
    }
  }

  if (lastError && isRateLimitError(lastError) && config.googleAiFallbackOnRateLimit) {
    return buildFallbackReport({
      checkerResults,
      summary,
      reason: 'Gemini rate limit/quota exceeded after retries.',
    });
  }

  throw lastError || new Error('Failed to generate AI report');
}

function mapAiError(err) {
  const message = err.message || 'Failed to generate AI report';

  if (isConfigError(err)) {
    return {
      status: 502,
      error: 'ai_config_error',
      message: 'Invalid or missing GOOGLE_API_KEY.',
    };
  }
  if (isRateLimitError(err)) {
    return {
      status: 503,
      error: 'ai_rate_limited',
      message:
        'Google API rate limit or quota exceeded. Enable GOOGLE_AI_FALLBACK_ON_RATE_LIMIT=true (default) or wait and retry.',
    };
  }

  return {
    status: 502,
    error: 'ai_error',
    message,
  };
}

module.exports = {
  generateAiReport,
  mapAiError,
  buildFallbackReport,
  isRateLimitError,
};
