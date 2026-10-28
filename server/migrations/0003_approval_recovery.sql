PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS hunter_access (
  owner TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','suspended')),
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  updated_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS hunter_pending_user AFTER INSERT ON user BEGIN
  INSERT INTO hunter_access(owner,status,role,updated_at) VALUES(NEW.id,'pending','user',unixepoch()*1000);
END;
INSERT OR IGNORE INTO hunter_access SELECT id,'pending','user',unixepoch()*1000 FROM user;
CREATE TABLE IF NOT EXISTS hunter_recovery (
  owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  used_at INTEGER,
  claim_tag TEXT,
  PRIMARY KEY(owner,code_hash)
);
CREATE TABLE IF NOT EXISTS hunter_limits (
  key TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL
);
