const { blobPaths, pathMatches, buildResult } = require('./helpers');

const TEST_DIR_PATTERNS = [
  /^tests?\//i,
  /^__tests__\//,
  /\/tests?\//i,
  /\/__tests__\//,
];

const TEST_FILE_PATTERNS = [
  /\.test\.(js|ts|jsx|tsx)$/i,
  /\.spec\.(js|ts|jsx|tsx)$/i,
  /_test\.go$/i,
  /Test\.(java|kt)$/,
];

const TEST_CONFIG_PATTERNS = [
  /jest\.config\.(js|ts|mjs|cjs)$/i,
  /vitest\.config\.(js|ts)$/i,
  /pytest\.ini$/i,
  /phpunit\.xml/i,
  /\.github\/workflows\/.*test/i,
];

function run(snapshot) {
  const paths = blobPaths(snapshot);
  const findings = [];

  const hasTestDir = paths.some((path) =>
    TEST_DIR_PATTERNS.some((pattern) => pattern.test(path))
  );
  const hasTestFiles = pathMatches(paths, TEST_FILE_PATTERNS);
  const hasTestConfig = pathMatches(paths, TEST_CONFIG_PATTERNS);
  const hasPackageJson = paths.includes('package.json');

  if (hasTestDir || hasTestFiles) {
    findings.push({
      severity: 'pass',
      message: 'Test files or test directories were found in the repository.',
    });
  } else {
    findings.push({
      severity: 'fail',
      message: 'No test directory or test file patterns detected (e.g. tests/, *.test.js).',
    });
  }

  if (hasTestConfig) {
    findings.push({
      severity: 'pass',
      message: 'Test runner configuration file detected.',
    });
  } else if (hasPackageJson) {
    findings.push({
      severity: 'warn',
      message: 'package.json exists but no jest/vitest/pytest config found in the file tree.',
    });
  }

  if (snapshot.fileTree.truncated) {
    findings.push({
      severity: 'warn',
      message: 'File tree was truncated by GitHub; some test files may not have been scanned.',
    });
  }

  const summary =
    hasTestDir || hasTestFiles
      ? 'Testing signals present in the repo layout.'
      : 'No clear testing layout — high risk before production deploy.';

  return buildResult('tests', 'Tests', findings, summary);
}

module.exports = { run };
