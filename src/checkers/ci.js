const { blobPaths, buildResult } = require('./helpers');

const CI_PATH_PATTERNS = [
  /^\.github\/workflows\/.+\.(ya?ml|yml)$/i,
  /^\.gitlab-ci\.yml$/i,
  /^\.circleci\//i,
  /^\.travis\.yml$/i,
  /^azure-pipelines\.ya?ml$/i,
  /^Jenkinsfile$/i,
];

function run(snapshot) {
  const paths = blobPaths(snapshot);
  const findings = [];

  const ciFiles = paths.filter((path) =>
    CI_PATH_PATTERNS.some((pattern) => pattern.test(path))
  );

  const githubActions = ciFiles.filter((path) =>
    /^\.github\/workflows\//i.test(path)
  );

  if (ciFiles.length > 0) {
    findings.push({
      severity: 'pass',
      message: `CI configuration found: ${ciFiles.slice(0, 5).join(', ')}`,
    });
  } else {
    findings.push({
      severity: 'fail',
      message: 'No CI config detected (.github/workflows, GitLab CI, etc.).',
    });
  }

  if (githubActions.length > 0) {
    findings.push({
      severity: 'pass',
      message: `GitHub Actions workflows: ${githubActions.join(', ')}`,
    });
  } else if (ciFiles.length > 0) {
    findings.push({
      severity: 'warn',
      message: 'CI exists but not via GitHub Actions — verify it runs on push/PR.',
    });
  }

  const recent = snapshot.recentCommits || [];
  if (recent.length > 0) {
    findings.push({
      severity: 'pass',
      message: `Recent activity: ${recent.length} commits fetched (latest: ${recent[0].sha}).`,
    });
  }

  const summary =
    ciFiles.length > 0
      ? 'Automated CI configuration present in the repository.'
      : 'No CI pipeline files found — tests likely are not run automatically.';

  return buildResult('ci', 'CI / Automation', findings, summary);
}

module.exports = { run };
