import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";
import config from "../config";
import {
  sessions,
  devices,
  authTokens,
  sessionMessages,
  sessionContacts,
  sessionConfigurations,
  sessionGroups,
} from "./schema";
import type {
  Sessions,
  Devices,
  AuthTokens as AuthTokensType,
  SessionContacts,
  SessionMessages,
  SessionConfigurations,
  SessionGroups,
} from "./types";

const url = config.DATABASE_URL;
const sqlite = new Database(url.replace("sqlite://", ""));
const db = drizzle(sqlite, { schema });

export const SessionManager = {
  async set(data: Sessions): Promise<void> {
    await db
      .insert(sessions)
      .values({
        ...data,
        isBusinessAccount: data.isBusinessAccount,
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          status: data.status,
          name: data.name,
          profileUrl: data.profileUrl,
          isBusinessAccount: data.isBusinessAccount,
        },
      });
  },
  async get(id: string): Promise<Sessions | null> {
    const res = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .get();
    // @ts-ignore - Drizzle types vs local types compatibility
    return res || null;
  },
  async del(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  },
};

export const DevicesManager = {
  async set(data: Devices): Promise<void> {
    await db
      .insert(devices)
      .values({
        sessionId: data.sessionId,
        user: data.User || "", // Map User to user column
        deviceInfo: data.deviceInfo,
        lastSeenAt: data.lastSeenAt,
        createdAt: data.createdAt,
      })
      .onConflictDoUpdate({
        target: [devices.sessionId, devices.user],
        set: {
          deviceInfo: data.deviceInfo,
          lastSeenAt: data.lastSeenAt,
        },
      });
  },

  async get(sessionId: string): Promise<Devices | null> {
    const res = db
      .select()
      .from(devices)
      .where(eq(devices.sessionId, sessionId))
      .get();
    if (!res) return null;
    return {
      ...res,
      User: res.user,
    };
  },

  async del(sessionId: string): Promise<void> {
    await db.delete(devices).where(eq(devices.sessionId, sessionId));
  },
};

export const AuthTokenManager = {
  async set(data: AuthTokensType): Promise<void> {
    await db
      .insert(authTokens)
      .values(data)
      .onConflictDoUpdate({
        target: [authTokens.sessionId, authTokens.token],
        set: {
          value: data.value,
        },
      });
  },
  async get(sessionId: string): Promise<AuthTokensType | null> {
    const res = db
      .select()
      .from(authTokens)
      .where(eq(authTokens.sessionId, sessionId))
      .get();
    return res || null;
  },
  async del(sessionId: string): Promise<void> {
    await db.delete(authTokens).where(eq(authTokens.sessionId, sessionId));
  },
};

export const MessageManager = {
  async set(data: SessionMessages): Promise<void> {
    await db
      .insert(sessionMessages)
      .values(data)
      .onConflictDoUpdate({
        target: sessionMessages.messageId,
        set: {
          messageContent: data.messageContent,
        },
      });
  },
  async get(sessionId: string): Promise<SessionMessages[] | null> {
    const res = await db
      .select()
      .from(sessionMessages)
      .where(eq(sessionMessages.sessionId, sessionId));
    return res.length ? res : null;
  },
  async del(sessionId: string): Promise<void> {
    await db
      .delete(sessionMessages)
      .where(eq(sessionMessages.sessionId, sessionId));
  },
};

export const ContactManager = {
  async set(data: SessionContacts): Promise<void> {
    await db
      .insert(sessionContacts)
      .values(data)
      .onConflictDoUpdate({
        target: [sessionContacts.sessionId, sessionContacts.contactPn],
        set: {
          contactLid: data.contactLid,
          addedAt: data.addedAt,
        },
      });
  },

  async get(sessionId: string): Promise<SessionContacts[] | null> {
    const res = await db
      .select()
      .from(sessionContacts)
      .where(eq(sessionContacts.sessionId, sessionId));
    return res.length ? res : null;
  },

  async del(sessionId: string, contactPn: string): Promise<void> {
    await db
      .delete(sessionContacts)
      .where(
        and(
          eq(sessionContacts.sessionId, sessionId),
          eq(sessionContacts.contactPn, contactPn),
        ),
      );
  },
};

export const ConfigManager = {
  async set(data: SessionConfigurations): Promise<void> {
    await db
      .insert(sessionConfigurations)
      .values(data)
      .onConflictDoUpdate({
        target: sessionConfigurations.sessionId,
        set: {
          configKey: data.configKey,
          configValue: data.configValue,
        },
      });
  },
  async get(sessionId: string): Promise<SessionConfigurations | null> {
    const res = db
      .select()
      .from(sessionConfigurations)
      .where(eq(sessionConfigurations.sessionId, sessionId))
      .get();
    return res || null;
  },
  async del(sessionId: string): Promise<void> {
    await db
      .delete(sessionConfigurations)
      .where(eq(sessionConfigurations.sessionId, sessionId));
  },
};

export const GroupManager = {
  async set(data: SessionGroups): Promise<void> {
    await db
      .insert(sessionGroups)
      .values(data)
      .onConflictDoUpdate({
        target: sessionGroups.groupId,
        set: {
          groupInfo: data.groupInfo,
          updatedAt: data.updatedAt,
          sessionId: data.sessionId,
        },
      });
  },

  async get(sessionId: string): Promise<SessionGroups[] | null> {
    const res = await db
      .select()
      .from(sessionGroups)
      .where(eq(sessionGroups.sessionId, sessionId));
    return res.length ? res : null;
  },

  async del(groupId: string): Promise<void> {
    await db.delete(sessionGroups).where(eq(sessionGroups.groupId, groupId));
  },
};

export * from "./session";
export * from "./contacts";
export * from "./groups";
export * from "./messages";
export * from "./types";
