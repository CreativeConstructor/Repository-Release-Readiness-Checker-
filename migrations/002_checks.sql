-- Saved release readiness checks (Chunk 8)
CREATE TABLE IF NOT EXISTS checks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  repo_full_name VARCHAR(255),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  verdict VARCHAR(20) NOT NULL,
  checker_summary JSONB NOT NULL,
  checker_results JSONB NOT NULL,
  ai_report JSONB NOT NULL,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checks_user_id ON checks (user_id);
CREATE INDEX IF NOT EXISTS idx_checks_user_score ON checks (user_id, score);
CREATE INDEX IF NOT EXISTS idx_checks_user_created ON checks (user_id, created_at DESC);
