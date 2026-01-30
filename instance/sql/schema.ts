import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull(),
    name: text("name"),
    profileUrl: text("profileUrl"),
    isBusinessAccount: integer("isBusinessAccount", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => ({
    statusIdx: index("idx_sessions_status").on(table.status),
  }),
);

export const devices = sqliteTable(
  "devices",
  {
    sessionId: text("sessionId")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    user: text("User").notNull(),
    deviceInfo: text("deviceInfo"),
    lastSeenAt: integer("lastSeenAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sessionId, table.user] }),
  }),
);

export const authTokens = sqliteTable(
  "auth_tokens",
  {
    sessionId: text("sessionId")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    value: text("value").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sessionId, table.token] }),
  }),
);

export const sessionContacts = sqliteTable(
  "session_contacts",
  {
    sessionId: text("sessionId")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    contactPn: text("contactPn").notNull(),
    contactLid: text("contactLid"),
    addedAt: integer("addedAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sessionId, table.contactPn] }),
    sessionIdIdx: index("idx_session_contacts_sessionId").on(table.sessionId),
  }),
);

export const sessionMessages = sqliteTable("session_messages", {
  sessionId: text("sessionId")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  messageId: text("messageId").primaryKey(),
  messageContent: text("messageContent"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

export const sessionConfigurations = sqliteTable("session_configurations", {
  sessionId: text("sessionId")
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),
  configKey: text("configKey").notNull(),
  configValue: text("configValue"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

export const sessionGroups = sqliteTable("session_groups", {
  groupId: text("groupId").primaryKey(),
  sessionId: text("sessionId")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  groupInfo: text("groupInfo"),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});
