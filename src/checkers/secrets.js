const { blobPaths, pathMatches, buildResult } = require('./helpers');

const RISKY_PATH_PATTERNS = [
  /^\.env$/i,
  /^\.env\./i,
  /(^|\/)credentials\.json$/i,
  /(^|\/)secrets?\.(json|ya?ml)$/i,
  /id_rsa$/i,
  /\.pem$/i,
  /(^|\/)config\/secrets/i,
];

const CONTENT_SECRET_PATTERNS = [
  { label: 'GitHub personal access token', pattern: /ghp_[a-zA-Z0-9]{20,}/ },
  { label: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/ },
  { label: 'Generic API key assignment', pattern: /api[_-]?key\s*=\s*['"][a-z0-9]{16,}/i },
];

function run(snapshot) {
  const paths = blobPaths(snapshot);
  const findings = [];

  const riskyPaths = paths.filter((path) =>
    RISKY_PATH_PATTERNS.some((pattern) => pattern.test(path))
  );

  if (riskyPaths.length > 0) {
    findings.push({
      severity: 'fail',
      message: `Sensitive-looking files are tracked in the repo: ${riskyPaths.slice(0, 5).join(', ')}`,
    });
  } else {
    findings.push({
      severity: 'pass',
      message: 'No .env, credentials.json, or private key paths found in the file tree.',
    });
  }

  const readmeContent = snapshot.readme?.content || '';
  for (const { label, pattern } of CONTENT_SECRET_PATTERNS) {
    if (pattern.test(readmeContent)) {
      findings.push({
        severity: 'fail',
        message: `Possible ${label} pattern detected in README content.`,
      });
    }
  }

  if (findings.every((f) => f.severity === 'pass')) {
    findings.push({
      severity: 'warn',
      message:
        'Tree-only scan: secrets inside source files are not inspected yet (only paths + README).',
    });
  }

  const summary =
    riskyPaths.length > 0
      ? 'Potential secrets committed to the repository.'
      : 'No obvious secret files in tree; README scanned for common token patterns.';

  return buildResult('secrets', 'Secrets', findings, summary);
}

module.exports = { run };
