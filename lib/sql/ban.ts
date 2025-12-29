import { bunql } from "./_sql";

const Ban = bunql.define("ban", {
  session_id: { type: "TEXT", notNull: true },
  pn: { type: "TEXT", notNull: true },
  lid: { type: "TEXT" },
});

// Create index for efficient lookups by session
try {
  bunql.exec("CREATE INDEX IF NOT EXISTS idx_ban_session ON ban(session_id)");
} catch {
  // Index may already exist
}

export const isBan = (sessionId: string, id: string) => {
  const users = Ban.query()
    .where("session_id", "=", sessionId)
    .where("pn", "=", id)
    .orWhere("lid", "=", id)
    .get();
  return [...users.map((u) => u.pn), ...users.map((u) => u.lid)].includes(id);
};

export const addBan = (sessionId: string, pn: string, lid: string) => {
  const existing = Ban.query()
    .where("session_id", "=", sessionId)
    .where("pn", "=", pn)
    .get();
  if (existing.length > 0) {
    return existing[0];
  }
  return Ban.insert({ session_id: sessionId, pn, lid });
};

export const removeBan = (sessionId: string, id: string) => {
  return Ban.delete()
    .where("session_id", "=", sessionId)
    .where("pn", "=", id)
    .orWhere("lid", "=", id)
    .run();
};
