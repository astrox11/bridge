import { bunql, execWithParams } from "./_sql";
import {
  createUserActivitySettingsTable,
  getPhoneFromSessionId,
  getUserTableName,
} from "./tables";

/**
 * Get the appropriate activity settings table for a session
 */
function getActivitySettingsTable(sessionId: string) {
  const phoneNumber = getPhoneFromSessionId(sessionId);
  createUserActivitySettingsTable(phoneNumber);
  return getUserTableName(phoneNumber, "activity_settings");
}

export interface ActivitySettings {
  readmessages: boolean;
  antidelete: boolean;
  antispam: boolean;
  typing: boolean;
  recording: boolean;
  anticall: boolean;
  online: boolean;
}

const DEFAULT_SETTINGS: ActivitySettings = {
  readmessages: false,
  antidelete: false,
  antispam: false,
  typing: false,
  recording: false,
  anticall: false,
  online: false,
};

/**
 * Get activity settings for a session
 */
export const getActivitySettings = (sessionId: string): ActivitySettings => {
  const tableName = getActivitySettingsTable(sessionId);
  const rows = bunql.query<{
    readmessages: number;
    antidelete: number;
    antispam: number;
    typing: number;
    recording: number;
    anticall: number;
    online: number;
  }>(`SELECT * FROM "${tableName}" WHERE id = 1`);

  const row = rows[0];
  if (!row) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    readmessages: row.readmessages === 1,
    antidelete: row.antidelete === 1,
    antispam: row.antispam === 1,
    typing: row.typing === 1,
    recording: row.recording === 1,
    anticall: row.anticall === 1,
    online: row.online === 1,
  };
};

/**
 * Update activity settings for a session
 */
export const setActivitySettings = (
  sessionId: string,
  settings: Partial<ActivitySettings>,
): ActivitySettings => {
  const tableName = getActivitySettingsTable(sessionId);
  const current = getActivitySettings(sessionId);

  const updated: ActivitySettings = {
    ...current,
    ...settings,
  };

  const rows = bunql.query<{ id: number }>(
    `SELECT id FROM "${tableName}" WHERE id = 1`,
  );

  if (rows.length > 0) {
    execWithParams(
      `UPDATE "${tableName}" SET 
        readmessages = ?,
        antidelete = ?,
        antispam = ?,
        typing = ?,
        recording = ?,
        anticall = ?,
        online = ?
       WHERE id = 1`,
      [
        updated.readmessages ? 1 : 0,
        updated.antidelete ? 1 : 0,
        updated.antispam ? 1 : 0,
        updated.typing ? 1 : 0,
        updated.recording ? 1 : 0,
        updated.anticall ? 1 : 0,
        updated.online ? 1 : 0,
      ],
    );
  } else {
    execWithParams(
      `INSERT INTO "${tableName}" (id, readmessages, antidelete, antispam, typing, recording, anticall, online) VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        updated.readmessages ? 1 : 0,
        updated.antidelete ? 1 : 0,
        updated.antispam ? 1 : 0,
        updated.typing ? 1 : 0,
        updated.recording ? 1 : 0,
        updated.anticall ? 1 : 0,
        updated.online ? 1 : 0,
      ],
    );
  }

  return updated;
};

/**
 * Toggle a specific activity setting for a session
 */
export const toggleActivitySetting = (
  sessionId: string,
  setting: keyof ActivitySettings,
): ActivitySettings => {
  const current = getActivitySettings(sessionId);
  return setActivitySettings(sessionId, {
    [setting]: !current[setting],
  });
};
