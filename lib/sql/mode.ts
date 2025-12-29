import { bunql } from "./_sql";

const BotMode = bunql.define("mode", {
  session_id: { type: "TEXT", primary: true },
  mode: { type: "TEXT", notNull: true },
});

type Mode = "private" | "public";

export const setMode = (sessionId: string, type: Mode): boolean | null => {
  const row = BotMode.query().where("session_id", "=", sessionId).first();

  if (row?.mode === type) return null;

  if (row) {
    BotMode.update({ mode: type }).where("session_id", "=", sessionId).run();
  } else {
    BotMode.insert({ session_id: sessionId, mode: type });
  }

  return true;
};

export const getMode = (sessionId: string): Mode => {
  const row = BotMode.query().where("session_id", "=", sessionId).first();
  return (row?.mode as Mode) ?? "private";
};
