import { proto, type WAMessageKey } from "baileys";
import { bunql } from "./_sql";
import type { WAMessage } from "baileys/src";

const Message = bunql.define("messages", {
  session_id: { type: "TEXT", notNull: true },
  id: { type: "TEXT", notNull: true },
  msg: { type: "TEXT" },
});

// Create composite index for efficient lookups
try {
  bunql.exec(
    "CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id)",
  );
} catch {
  // Index may already exist
}

export const getMessage = async (sessionId: string, key: WAMessageKey) => {
  const id = key?.id;
  if (id) {
    const m = Message.query()
      .where("session_id", "=", sessionId)
      .where("id", "=", id)
      .first();
    return m ? proto.Message.fromObject(JSON.parse(m.msg)) : undefined;
  }
  return undefined;
};

export const saveMessage = (
  sessionId: string,
  key: WAMessageKey,
  msg: WAMessage,
) => {
  const id = key?.id;
  if (id) {
    const exists = Message.query()
      .where("session_id", "=", sessionId)
      .where("id", "=", id)
      .first();
    if (exists) {
      Message.update({ msg: JSON.stringify(msg || {}) })
        .where("session_id", "=", sessionId)
        .where("id", "=", id)
        .run();
    } else {
      Message.insert({
        session_id: sessionId,
        id,
        msg: JSON.stringify(msg || {}),
      });
    }
  }
};
