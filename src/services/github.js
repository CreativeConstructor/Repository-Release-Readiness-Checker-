const { Octokit } = require('@octokit/rest');
const config = require('../lib/config');
const { parseRepoUrl } = require('../lib/parseRepoUrl');

function createOctokit() {
  return new Octokit({
    auth: config.githubToken || undefined,
  });
}

async function fetchFileTree(octokit, owner, repo) {
  const { data: repoData } = await octokit.repos.get({ owner, repo });

  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${repoData.default_branch}`,
  });

  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: ref.object.sha,
    recursive: 'true',
  });

  return {
    defaultBranch: repoData.default_branch,
    truncated: tree.truncated,
    entries: tree.tree.map((entry) => ({
      path: entry.path,
      type: entry.type,
      size: entry.size ?? null,
    })),
  };
}

async function fetchRecentCommits(octokit, owner, repo) {
  const { data: commits } = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: 10,
  });

  return commits.map((commit) => ({
    sha: commit.sha.slice(0, 7),
    message: commit.commit.message.split('\n')[0],
    author: commit.commit.author?.name || commit.author?.login || 'unknown',
    date: commit.commit.author?.date,
  }));
}

async function fetchReadme(octokit, owner, repo) {
  try {
    const { data } = await octokit.repos.getReadme({ owner, repo });
    const content = Buffer.from(data.content, 'base64').toString('utf8');

    return {
      path: data.path,
      size: data.size,
      content,
    };
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
}

async function fetchRepoSnapshot(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const octokit = createOctokit();

  const [fileTree, recentCommits, readme] = await Promise.all([
    fetchFileTree(octokit, owner, repo),
    fetchRecentCommits(octokit, owner, repo),
    fetchReadme(octokit, owner, repo),
  ]);

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    defaultBranch: fileTree.defaultBranch,
    fileTree: {
      truncated: fileTree.truncated,
      entryCount: fileTree.entries.length,
      entries: fileTree.entries,
    },
    recentCommits,
    readme,
  };
}

function mapGitHubError(err) {
  if (err.status === 404) {
    return {
      status: 404,
      error: 'not_found',
      message: 'Repository not found or not accessible. Check the URL and GITHUB_TOKEN for private repos.',
    };
  }
  if (err.status === 403) {
    return {
      status: 403,
      error: 'forbidden',
      message: 'GitHub API rate limit or permission denied. Add GITHUB_TOKEN to .env.',
    };
  }
  return {
    status: 502,
    error: 'github_error',
    message: err.message || 'Failed to fetch repository from GitHub',
  };
}

module.exports = {
  fetchRepoSnapshot,
  mapGitHubError,
};
