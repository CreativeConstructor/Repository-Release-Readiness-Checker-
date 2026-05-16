const { blobPaths, buildResult } = require('./helpers');

function run(snapshot) {
  const paths = blobPaths(snapshot);
  const findings = [];

  const dockerfilePaths = paths.filter(
    (path) => path === 'Dockerfile' || path.endsWith('/Dockerfile')
  );
  const composePaths = paths.filter((path) =>
    /(^|\/)(docker-)?compose\.(ya?ml|yml)$/i.test(path)
  );
  const hasDockerignore = paths.includes('.dockerignore');

  if (dockerfilePaths.length > 0) {
    findings.push({
      severity: 'pass',
      message: `Dockerfile found: ${dockerfilePaths.join(', ')}`,
    });
  } else {
    findings.push({
      severity: 'warn',
      message: 'No Dockerfile found — deployment may be manual or undocumented.',
    });
  }

  if (composePaths.length > 0) {
    findings.push({
      severity: 'pass',
      message: `Compose file found: ${composePaths.join(', ')}`,
    });
  } else if (dockerfilePaths.length > 0) {
    findings.push({
      severity: 'warn',
      message: 'Dockerfile exists but no docker-compose.yml — fine for simple apps, harder for local dev.',
    });
  }

  if (dockerfilePaths.length > 0 && !hasDockerignore) {
    findings.push({
      severity: 'warn',
      message: 'Dockerfile without .dockerignore — builds may include node_modules or secrets.',
    });
  } else if (hasDockerignore) {
    findings.push({
      severity: 'pass',
      message: '.dockerignore present.',
    });
  }

  const summary =
    dockerfilePaths.length > 0
      ? 'Container build files detected.'
      : 'No Docker packaging detected in the repository root.';

  return buildResult('docker', 'Docker', findings, summary);
}

module.exports = { run };
