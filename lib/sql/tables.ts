/**
 * Dynamic per-user table management
 * Creates and manages tables with format: user_<phoneNumber>_<tableName>
 */
import { bunql } from "./_sql";
import { log } from "../util/logger";

// Allowed table suffixes - whitelist approach for security
const ALLOWED_TABLE_SUFFIXES = [
  "auth",
  "messages",
  "contacts",
  "groups",
  "sudo",
  "ban",
  "mode",
  "prefix",
  "antidelete",
] as const;

type TableSuffix = (typeof ALLOWED_TABLE_SUFFIXES)[number];

/**
 * Validate table suffix against whitelist
 */
function isValidTableSuffix(suffix: string): suffix is TableSuffix {
  return ALLOWED_TABLE_SUFFIXES.includes(suffix as TableSuffix);
}

/**
 * Sanitize phone number to contain only digits
 */
function sanitizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, "");
}

/**
 * Generate a table name for a specific user session
 * Format: user_<phoneNumber>_<tableName>
 * Both phone number and table name are validated/sanitized
 */
export function getUserTableName(
  phoneNumber: string,
  tableName: TableSuffix,
): string {
  // Sanitize phone number (remove any non-digit characters)
  const sanitizedPhone = sanitizePhoneNumber(phoneNumber);

  // Validate table name is in the whitelist
  if (!isValidTableSuffix(tableName)) {
    throw new Error(`Invalid table suffix: ${tableName}`);
  }

  return `user_${sanitizedPhone}_${tableName}`;
}

/**
 * Extract phone number from a session ID (format: session_<phoneNumber>)
 */
export function getPhoneFromSessionId(sessionId: string): string {
  return sessionId.replace(/^session_/, "");
}

// Table definitions cache to avoid recreating tables
const createdTables = new Set<string>();

/**
 * Create auth table for a specific user session
 */
export function createUserAuthTable(phoneNumber: string): string {
  const tableName = getUserTableName(phoneNumber, "auth");

  if (!createdTables.has(tableName)) {
    try {
      bunql.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          name TEXT PRIMARY KEY,
          data TEXT NOT NULL
        )
      `);
      createdTables.add(tableName);
    } catch (error) {
      log.error(`Failed to create table ${tableName}:`, error);
    }
  }

  return tableName;
}

/**
 * Create messages table for a specific user session
 */
export function createUserMessagesTable(phoneNumber: string): string {
  const tableName = getUserTableName(phoneNumber, "messages");
  
  if (!createdTables.has(tableName)) {
    try {
      bunql.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id TEXT PRIMARY KEY,
          msg TEXT
        )
      `);
      createdTables.add(tableName);
    } catch (error) {
      log.error(`Failed to create table ${tableName}:`, error);
    }
  }
  
  return tableName;
}

/**
 * Create contacts table for a specific user session
 */
export function createUserContactsTable(phoneNumber: string): string {
  const tableName = getUserTableName(phoneNumber, "contacts");
  
  if (!createdTables.has(tableName)) {
    try {
      bunql.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          pn TEXT PRIMARY KEY,
          lid TEXT
        )
      `);
      createdTables.add(tableName);
    } catch (error) {
      log.error(`Failed to create table ${tableName}:`, error);
    }
  }
  
  return tableName;
}

/**
 * Create groups table for a specific user session
 */
export function createUserGroupsTable(phoneNumber: string): string {
  const tableName = getUserTableName(phoneNumber, "groups");
  
  if (!createdTables.has(tableName)) {
    try {
      bunql.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id TEXT PRIMARY KEY,
          data TEXT
        )
      `);
      createdTables.add(tableName);
    } catch (error) {
      log.error(`Failed to create table ${tableName}:`, error);
    }
  }
  
  return tableName;
}

/**
 * Create sudo table for a specific user session
 */
export function createUserSudoTable(phoneNumber: string): string {
  const tableName = getUserTableName(phoneNumber, "sudo");
  
  if (!createdTables.has(tableName)) {
    try {
      bunql.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          pn TEXT PRIMARY KEY,
          lid TEXT
        )
      `);
      createdTables.add(tableName);
    } catch (error) {
      log.error(`Failed to create table ${tableName}:`, error);
    }
  }
  
  return tableName;
}

/**
 * Create ban table for a specific user session
 */
export function createUserBanTable(phoneNumber: string): string {
  const tableName = getUserTableName(phoneNumber, "ban");
  
  if (!createdTables.has(tableName)) {
    try {
      bunql.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          pn TEXT PRIMARY KEY,
          lid TEXT
        )
      `);
      createdTables.add(tableName);
    } catch (error) {
      log.error(`Failed to create table ${tableName}:`, error);
    }
  }
  
  return tableName;
}

/**
 * Create mode table for a specific user session
 */
export function createUserModeTable(phoneNumber: string): string {
  const tableName = getUserTableName(phoneNumber, "mode");
  
  if (!createdTables.has(tableName)) {
    try {
      bunql.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          mode TEXT NOT NULL
        )
      `);
      createdTables.add(tableName);
    } catch (error) {
      log.error(`Failed to create table ${tableName}:`, error);
    }
  }
  
  return tableName;
}

/**
 * Create prefix table for a specific user session
 */
export function createUserPrefixTable(phoneNumber: string): string {
  const tableName = getUserTableName(phoneNumber, "prefix");
  
  if (!createdTables.has(tableName)) {
    try {
      bunql.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          prefix TEXT
        )
      `);
      createdTables.add(tableName);
    } catch (error) {
      log.error(`Failed to create table ${tableName}:`, error);
    }
  }
  
  return tableName;
}

/**
 * Create antidelete table for a specific user session
 */
export function createUserAntideleteTable(phoneNumber: string): string {
  const tableName = getUserTableName(phoneNumber, "antidelete");
  
  if (!createdTables.has(tableName)) {
    try {
      bunql.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          active INTEGER NOT NULL,
          mode TEXT
        )
      `);
      createdTables.add(tableName);
    } catch (error) {
      log.error(`Failed to create table ${tableName}:`, error);
    }
  }
  
  return tableName;
}

/**
 * Initialize all tables for a user session
 */
export function initializeUserTables(phoneNumber: string): void {
  createUserAuthTable(phoneNumber);
  createUserMessagesTable(phoneNumber);
  createUserContactsTable(phoneNumber);
  createUserGroupsTable(phoneNumber);
  createUserSudoTable(phoneNumber);
  createUserBanTable(phoneNumber);
  createUserModeTable(phoneNumber);
  createUserPrefixTable(phoneNumber);
  createUserAntideleteTable(phoneNumber);
  log.debug(`Initialized tables for user ${phoneNumber}`);
}

/**
 * Delete all tables for a user session (cleanup on session delete)
 */
export function deleteUserTables(phoneNumber: string): void {
  const sanitizedPhone = sanitizePhoneNumber(phoneNumber);

  for (const table of ALLOWED_TABLE_SUFFIXES) {
    const tableName = `user_${sanitizedPhone}_${table}`;
    try {
      bunql.exec(`DROP TABLE IF EXISTS "${tableName}"`);
      createdTables.delete(tableName);
    } catch (error) {
      log.error(`Failed to drop table ${tableName}:`, error);
    }
  }

  log.debug(`Deleted tables for user ${phoneNumber}`);
}
