const tests = require('./tests');
const secrets = require('./secrets');
const docker = require('./docker');
const readme = require('./readme');
const ci = require('./ci');

const CHECKERS = [tests, secrets, docker, readme, ci];

async function runAllCheckers(snapshot) {
  return Promise.all(CHECKERS.map((checker) => checker.run(snapshot)));
}

function summarizeResults(results) {
  const counts = { pass: 0, warn: 0, fail: 0 };

  for (const result of results) {
    counts[result.status] += 1;
  }

  let overall = 'pass';
  if (counts.fail > 0) overall = 'fail';
  else if (counts.warn > 0) overall = 'warn';

  return {
    overall,
    checkerCount: results.length,
    ...counts,
  };
}

module.exports = {
  runAllCheckers,
  summarizeResults,
};
