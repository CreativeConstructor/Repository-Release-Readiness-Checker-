const { buildResult } = require('./helpers');

const RECOMMENDED_SECTIONS = [
  { label: 'installation', pattern: /^#+\s*install(ation)?/im },
  { label: 'usage', pattern: /^#+\s*usage/im },
  { label: 'contributing', pattern: /^#+\s*contribut/i },
];

function run(snapshot) {
  const findings = [];

  if (!snapshot.readme) {
    findings.push({
      severity: 'fail',
      message: 'No README found — reviewers and new contributors lack onboarding docs.',
    });
    return buildResult(
      'readme',
      'README',
      findings,
      'Missing README is a release blocker for most teams.'
    );
  }

  const content = snapshot.readme.content;
  const length = content.length;

  if (length < 200) {
    findings.push({
      severity: 'warn',
      message: `README is very short (${length} characters).`,
    });
  } else {
    findings.push({
      severity: 'pass',
      message: `README has reasonable length (${length} characters).`,
    });
  }

  if (!/^#\s+.+/m.test(content)) {
    findings.push({
      severity: 'warn',
      message: 'README may be missing a top-level # title heading.',
    });
  }

  for (const { label, pattern } of RECOMMENDED_SECTIONS) {
    if (pattern.test(content)) {
      findings.push({
        severity: 'pass',
        message: `README includes a ${label} section.`,
      });
    } else {
      findings.push({
        severity: 'warn',
        message: `README missing a clear "${label}" section heading.`,
      });
    }
  }

  if (/!\[.+\]\(.+\)/.test(content) || /shields\.io|badge/i.test(content)) {
    findings.push({
      severity: 'pass',
      message: 'README includes badges or inline images (often build/status links).',
    });
  } else {
    findings.push({
      severity: 'warn',
      message: 'No badges detected — consider CI or coverage status shields.',
    });
  }

  const summary = 'README exists and was analyzed for structure and completeness.';

  return buildResult('readme', 'README', findings, summary);
}

module.exports = { run };
