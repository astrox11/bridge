import { bunql, execWithParams } from "./_sql";
import {
  createUserFilterTable,
  getPhoneFromSessionId,
  getUserTableName,
} from "./tables";

/**
 * Get the appropriate filter table for a session
 */
function getFilterTable(sessionId: string) {
  const phoneNumber = getPhoneFromSessionId(sessionId);
  createUserFilterTable(phoneNumber);
  return getUserTableName(phoneNumber, "filter");
}

/**
 * Add a filter
 */
export const addFilter = (
  sessionId: string,
  status: number,
  message: string,
) => {
  const tableName = getFilterTable(sessionId);
  execWithParams(`INSERT INTO "${tableName}" (status, message) VALUES (?, ?)`, [
    status,
    message,
  ]);
  return { session_id: sessionId, status, message };
};

/**
 * Get all filters
 */
export const getAllFilters = (sessionId: string) => {
  const tableName = getFilterTable(sessionId);
  const rows = bunql.query<{ id: number; status: number; message: string }>(
    `SELECT id, status, message FROM "${tableName}"`,
  );
  return rows;
};

/**
 * Get a specific filter by ID
 */
export const getFilterById = (sessionId: string, id: number) => {
  const tableName = getFilterTable(sessionId);
  const rows = bunql.query<{ id: number; status: number; message: string }>(
    `SELECT id, status, message FROM "${tableName}" WHERE id = ?`,
    [id],
  );
  return rows[0] || null;
};

/**
 * Delete a filter by ID
 */
export const deleteFilter = (sessionId: string, id: number) => {
  const tableName = getFilterTable(sessionId);
  execWithParams(`DELETE FROM "${tableName}" WHERE id = ?`, [id]);
  return { session_id: sessionId, id };
};

/**
 * Update a filter
 */
export const updateFilter = (
  sessionId: string,
  id: number,
  status: number,
  message: string,
) => {
  const tableName = getFilterTable(sessionId);
  execWithParams(
    `UPDATE "${tableName}" SET status = ?, message = ? WHERE id = ?`,
    [status, message, id],
  );
  return { session_id: sessionId, id, status, message };
};
