const { fetchRepoSnapshot, mapGitHubError } = require('./github');
const { generateAiReport, mapAiError } = require('./aiReport');
const { saveCheck } = require('./checkStore');
const { runAllCheckers, summarizeResults } = require('../checkers');

class CheckPipelineError extends Error {
  constructor(status, error, message) {
    super(message);
    this.name = 'CheckPipelineError';
    this.status = status;
    this.errorCode = error;
  }
}

function compactSnapshot(snapshot) {
  return {
    fullName: snapshot.fullName,
    defaultBranch: snapshot.defaultBranch,
    fileTree: {
      truncated: snapshot.fileTree.truncated,
      entryCount: snapshot.fileTree.entryCount,
    },
    recentCommitCount: snapshot.recentCommits.length,
    hasReadme: Boolean(snapshot.readme),
    readmePath: snapshot.readme?.path ?? null,
  };
}

async function runFullCheck(userId, repoUrl) {
  let snapshot;

  try {
    snapshot = await fetchRepoSnapshot(repoUrl);
  } catch (err) {
    if (err.status) {
      const mapped = mapGitHubError(err);
      throw new CheckPipelineError(mapped.status, mapped.error, mapped.message);
    }
    throw err;
  }

  const checkerResults = await runAllCheckers(snapshot);
  const summary = summarizeResults(checkerResults);
  const snapshotMeta = compactSnapshot(snapshot);

  let aiReport;
  try {
    aiReport = await generateAiReport({
      repoUrl,
      snapshot: snapshotMeta,
      checkerResults,
      summary,
    });
  } catch (aiErr) {
    const mapped = mapAiError(aiErr);
    throw new CheckPipelineError(mapped.status, mapped.error, mapped.message);
  }

  const saved = await saveCheck(userId, {
    repoUrl,
    repoFullName: snapshot.fullName,
    score: aiReport.score,
    verdict: aiReport.verdict,
    checkerSummary: summary,
    checkerResults,
    aiReport,
    snapshot: snapshotMeta,
  });

  return {
    checkId: saved.id,
    repoUrl,
    summary,
    checkerResults,
    aiReport,
    snapshot: snapshotMeta,
    createdAt: saved.createdAt,
  };
}

module.exports = {
  runFullCheck,
  CheckPipelineError,
};
