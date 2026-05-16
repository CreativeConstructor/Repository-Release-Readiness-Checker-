const { query } = require('../lib/db');

function mapCheckRow(row) {
  return {
    id: row.id,
    repoUrl: row.repo_url,
    repoFullName: row.repo_full_name,
    score: row.score,
    verdict: row.verdict,
    checkerSummary: row.checker_summary,
    checkerResults: row.checker_results,
    aiReport: row.ai_report,
    snapshot: row.snapshot,
    createdAt: row.created_at,
  };
}

async function saveCheck(userId, payload) {
  const { rows } = await query(
    `INSERT INTO checks (
       user_id, repo_url, repo_full_name, score, verdict,
       checker_summary, checker_results, ai_report, snapshot
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      payload.repoUrl,
      payload.repoFullName,
      payload.score,
      payload.verdict,
      JSON.stringify(payload.checkerSummary),
      JSON.stringify(payload.checkerResults),
      JSON.stringify(payload.aiReport),
      JSON.stringify(payload.snapshot),
    ]
  );

  return mapCheckRow(rows[0]);
}

async function listChecks(userId, { minScore, maxScore, verdict, limit, offset }) {
  const conditions = ['user_id = $1'];
  const params = [userId];
  let paramIndex = 2;

  if (minScore !== undefined) {
    conditions.push(`score >= $${paramIndex}`);
    params.push(minScore);
    paramIndex += 1;
  }
  if (maxScore !== undefined) {
    conditions.push(`score <= $${paramIndex}`);
    params.push(maxScore);
    paramIndex += 1;
  }
  if (verdict) {
    conditions.push(`verdict = $${paramIndex}`);
    params.push(verdict);
    paramIndex += 1;
  }

  params.push(limit, offset);

  const { rows } = await query(
    `SELECT id, repo_url, repo_full_name, score, verdict, created_at
     FROM checks
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    repoUrl: row.repo_url,
    repoFullName: row.repo_full_name,
    score: row.score,
    verdict: row.verdict,
    createdAt: row.created_at,
  }));
}

async function getCheckById(userId, checkId) {
  const { rows } = await query(
    `SELECT * FROM checks WHERE id = $1 AND user_id = $2`,
    [checkId, userId]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapCheckRow(rows[0]);
}

async function getTrends(userId) {
  const { rows: stats } = await query(
    `SELECT
       COUNT(*)::int AS total_checks,
       ROUND(AVG(score)::numeric, 1) AS average_score,
       MAX(score) AS highest_score,
       MIN(score) AS lowest_score
     FROM checks
     WHERE user_id = $1`,
    [userId]
  );

  const { rows: byDay } = await query(
    `SELECT
       DATE(created_at) AS day,
       ROUND(AVG(score)::numeric, 1) AS average_score,
       COUNT(*)::int AS check_count
     FROM checks
     WHERE user_id = $1
     GROUP BY DATE(created_at)
     ORDER BY day DESC
     LIMIT 30`,
    [userId]
  );

  const { rows: recent } = await query(
    `SELECT id, repo_full_name, score, verdict, created_at
     FROM checks
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId]
  );

  const stat = stats[0];

  return {
    totalChecks: stat.total_checks || 0,
    averageScore: stat.average_score ? Number(stat.average_score) : null,
    highestScore: stat.highest_score,
    lowestScore: stat.lowest_score,
    scoresByDay: byDay.map((row) => ({
      day: row.day,
      averageScore: Number(row.average_score),
      checkCount: row.check_count,
    })),
    recentChecks: recent.map((row) => ({
      id: row.id,
      repoFullName: row.repo_full_name,
      score: row.score,
      verdict: row.verdict,
      createdAt: row.created_at,
    })),
  };
}

module.exports = {
  saveCheck,
  listChecks,
  getCheckById,
  getTrends,
};
