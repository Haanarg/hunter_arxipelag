PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS hunter_saves (
  owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision>0),
  object_key TEXT NOT NULL,
  previous_key TEXT,
  name TEXT NOT NULL,
  seed INTEGER NOT NULL,
  map_scale INTEGER NOT NULL,
  played_seconds REAL NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(owner,id)
);
CREATE INDEX IF NOT EXISTS hunter_saves_owner_date ON hunter_saves(owner,updated_at DESC);
CREATE TABLE IF NOT EXISTS hunter_runs (
  owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision>0),
  record_json TEXT NOT NULL CHECK(length(record_json)<65536),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(owner,id)
);
CREATE INDEX IF NOT EXISTS hunter_runs_owner_date ON hunter_runs(owner,updated_at DESC);
