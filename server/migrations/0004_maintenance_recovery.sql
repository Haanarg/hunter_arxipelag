CREATE TABLE hunter_assisted_recovery (
  owner TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  issued_by TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  claim_tag TEXT
);
CREATE TABLE hunter_account_audit (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  target TEXT NOT NULL,
  event TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX hunter_audit_date ON hunter_account_audit(created_at);
CREATE TABLE hunter_maintenance (
  name TEXT PRIMARY KEY,
  cursor TEXT,
  lease TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX hunter_saves_object ON hunter_saves(object_key);
CREATE INDEX hunter_saves_previous ON hunter_saves(previous_key);
CREATE TABLE hunter_schema (version INTEGER PRIMARY KEY);
INSERT INTO hunter_schema(version) VALUES(4);
