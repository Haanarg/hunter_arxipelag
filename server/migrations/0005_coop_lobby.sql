CREATE TABLE hunter_coop_rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  seed INTEGER NOT NULL CHECK(seed>=0 AND seed<=4294967295),
  map_scale INTEGER NOT NULL CHECK(map_scale IN (1,2)),
  difficulty REAL NOT NULL CHECK(difficulty IN (0.6,1,1.5)),
  revision INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL
);
CREATE INDEX hunter_coop_expiry ON hunter_coop_rooms(expires_at);
CREATE TABLE hunter_coop_members (
  owner TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  room TEXT NOT NULL REFERENCES hunter_coop_rooms(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK(slot IN (0,1)),
  ready INTEGER NOT NULL DEFAULT 0 CHECK(ready IN (0,1)),
  last_seen INTEGER NOT NULL,
  UNIQUE(room,slot)
);
CREATE TRIGGER hunter_coop_host_guard BEFORE INSERT ON hunter_coop_members
WHEN (NEW.slot=0 AND NEW.owner<>(SELECT host FROM hunter_coop_rooms WHERE id=NEW.room))
 OR (NEW.slot=1 AND NEW.owner=(SELECT host FROM hunter_coop_rooms WHERE id=NEW.room))
BEGIN SELECT RAISE(ABORT,'invalid room slot'); END;
CREATE TRIGGER hunter_coop_joined AFTER INSERT ON hunter_coop_members BEGIN
  UPDATE hunter_coop_rooms SET revision=revision+1 WHERE id=NEW.room;
  UPDATE hunter_coop_members SET ready=0 WHERE room=NEW.room AND ready<>0;
END;
CREATE TRIGGER hunter_coop_left AFTER DELETE ON hunter_coop_members BEGIN
  UPDATE hunter_coop_rooms SET revision=revision+1 WHERE id=OLD.room;
  UPDATE hunter_coop_members SET ready=0 WHERE room=OLD.room AND ready<>0;
END;
CREATE TRIGGER hunter_coop_ready AFTER UPDATE OF ready ON hunter_coop_members WHEN NEW.ready<>OLD.ready BEGIN
  UPDATE hunter_coop_rooms SET revision=revision+1 WHERE id=NEW.room;
END;
CREATE TABLE hunter_coop_schema(version INTEGER PRIMARY KEY);
INSERT INTO hunter_coop_schema VALUES(1);
