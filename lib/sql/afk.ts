import { bunql, execWithParams } from "./_sql";
import {
  createUserAfkTable,
  getPhoneFromSessionId,
  getUserTableName,
} from "./tables";

/**
 * Get the appropriate afk table for a session
 */
function getAfkTable(sessionId: string) {
  const phoneNumber = getPhoneFromSessionId(sessionId);
  createUserAfkTable(phoneNumber);
  return getUserTableName(phoneNumber, "afk");
}

/**
 * Set AFK status
 */
export const setAfk = (sessionId: string, status: boolean, message?: string) => {
  const tableName = getAfkTable(sessionId);
  const statusValue = status ? 1 : 0;
  const rows = bunql.query<{ status: number; message: string }>(
    `SELECT status, message FROM "${tableName}" WHERE id = 1`,
  );
  const current = rows[0];

  if (current) {
    execWithParams(
      `UPDATE "${tableName}" SET status = ?, message = ? WHERE id = 1`,
      [statusValue, message || null],
    );
  } else {
    execWithParams(
      `INSERT INTO "${tableName}" (id, status, message) VALUES (1, ?, ?)`,
      [statusValue, message || null],
    );
  }

  return { session_id: sessionId, status: statusValue, message };
};

/**
 * Get AFK status
 */
export const getAfk = (sessionId: string) => {
  const tableName = getAfkTable(sessionId);
  const rows = bunql.query<{ status: number; message: string }>(
    `SELECT status, message FROM "${tableName}" WHERE id = 1`,
  );
  return rows[0] || null;
};
