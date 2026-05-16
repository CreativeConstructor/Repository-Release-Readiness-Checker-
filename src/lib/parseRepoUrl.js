function parseRepoUrl(repoUrl) {
  const normalized = repoUrl.replace(/\/$/, '');
  const url = new URL(normalized);
  const [owner, repoWithSuffix] = url.pathname.split('/').filter(Boolean);

  if (!owner || !repoWithSuffix) {
    throw new Error('Invalid GitHub repository URL');
  }

  const repo = repoWithSuffix.replace(/\.git$/i, '');

  return { owner, repo };
}

module.exports = { parseRepoUrl };
