function allPaths(snapshot) {
  return snapshot.fileTree.entries.map((entry) => entry.path);
}

function blobPaths(snapshot) {
  return snapshot.fileTree.entries
    .filter((entry) => entry.type === 'blob')
    .map((entry) => entry.path);
}

function pathMatches(paths, patterns) {
  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return paths.some((path) => pattern.test(path));
    }
    return paths.includes(pattern);
  });
}

function statusFromFindings(findings) {
  if (findings.some((f) => f.severity === 'fail')) return 'fail';
  if (findings.some((f) => f.severity === 'warn')) return 'warn';
  return 'pass';
}

function buildResult(id, name, findings, summary) {
  return {
    id,
    name,
    status: statusFromFindings(findings),
    findings,
    summary,
  };
}

module.exports = {
  allPaths,
  blobPaths,
  pathMatches,
  buildResult,
};
