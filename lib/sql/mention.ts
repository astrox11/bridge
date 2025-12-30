import { bunql, execWithParams } from "./_sql";
import {
  createUserMentionTable,
  getPhoneFromSessionId,
  getUserTableName,
} from "./tables";

/**
 * Get the appropriate mention table for a session
 */
function getMentionTable(sessionId: string) {
  const phoneNumber = getPhoneFromSessionId(sessionId);
  createUserMentionTable(phoneNumber);
  return getUserTableName(phoneNumber, "mention");
}

/**
 * Set mention message for a group
 */
export const setMentionMessage = (
  sessionId: string,
  groupId: string,
  message: string,
) => {
  const tableName = getMentionTable(sessionId);
  const rows = bunql.query<{ message: string }>(
    `SELECT message FROM "${tableName}" WHERE groupId = ?`,
    [groupId],
  );
  const current = rows[0];

  if (current) {
    execWithParams(
      `UPDATE "${tableName}" SET message = ? WHERE groupId = ?`,
      [message, groupId],
    );
  } else {
    execWithParams(`INSERT INTO "${tableName}" (groupId, message) VALUES (?, ?)`, [
      groupId,
      message,
    ]);
  }

  return { session_id: sessionId, groupId, message };
};

/**
 * Get mention message for a group
 */
export const getMentionMessage = (sessionId: string, groupId: string) => {
  const tableName = getMentionTable(sessionId);
  const rows = bunql.query<{ message: string }>(
    `SELECT message FROM "${tableName}" WHERE groupId = ?`,
    [groupId],
  );
  return rows[0]?.message || null;
};

/**
 * Delete mention message for a group
 */
export const deleteMentionMessage = (sessionId: string, groupId: string) => {
  const tableName = getMentionTable(sessionId);
  execWithParams(`DELETE FROM "${tableName}" WHERE groupId = ?`, [groupId]);
  return { session_id: sessionId, groupId };
};
