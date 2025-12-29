import { bunql } from "./_sql";
import {
  createUserAntideleteTable,
  getPhoneFromSessionId,
  getUserTableName,
} from "./tables";

/**
 * Get the appropriate antidelete table for a session
 */
function getAntideleteTable(sessionId: string) {
  const phoneNumber = getPhoneFromSessionId(sessionId);
  createUserAntideleteTable(phoneNumber);
  return getUserTableName(phoneNumber, "antidelete");
}

type AntideleteModes = "all" | "groups" | "p2p";

export const setAntidelete = (
  sessionId: string,
  active: boolean,
  mode: AntideleteModes,
) => {
  const tableName = getAntideleteTable(sessionId);
  const rows = bunql.query<{ active: number; mode: string }>(
    `SELECT active, mode FROM "${tableName}" WHERE id = 1`,
  );
  const current = rows[0];
  const activeValue = active ? 1 : 0;

  if (current && current.active === activeValue && current.mode === mode) {
    return null;
  }
  if (current) {
    bunql.exec(
      `UPDATE "${tableName}" SET active = ${activeValue}, mode = '${mode}' WHERE id = 1`,
    );
  } else {
    bunql.exec(
      `INSERT INTO "${tableName}" (id, active, mode) VALUES (1, ${activeValue}, '${mode}')`,
    );
  }

  return { session_id: sessionId, active: activeValue, mode };
};

export const getAntidelete = (sessionId: string) => {
  const tableName = getAntideleteTable(sessionId);
  const rows = bunql.query<{ active: number; mode: string }>(
    `SELECT active, mode FROM "${tableName}" WHERE id = 1`,
  );
  return rows[0];
};
