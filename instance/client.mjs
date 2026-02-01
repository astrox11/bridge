import makeWASocket, {
  delay,
  DisconnectReason,
  getDevice,
  isPnUser,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
} from "baileys";
import pino from "pino";
import NodeCache from "@cacheable/node-cache";
import { createClient } from "redis";
import { loadPlugins } from "./plugins";
import serialize, { socketOut, handleEvent, handleCommand } from "./utility";
import {
  getMessage,
  saveMessage,
  SessionStatus,
  SessionManager,
  DevicesManager,
  syncGroupMetadata,
  useHybridAuthState,
  cacheGroupMetadata,
  cachedGroupMetadata,
  syncGroupParticipantsToContactList,
} from "./sql";

const DEBUG = process.env.LOGS === 'true';
const log = (...args) => {
  if (DEBUG) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`  ${time}`, ...args);
  }
};

const logger = pino({ level: "silent" });

const redis = await createClient({
  url: "redis://localhost:6379",
  socket: {
    connectTimeout: 10000,
    keepAlive: 5000,
    reconnectStrategy: (retries) => {
      if (retries > 50) {
        log("[REDIS] Max retries reached, giving up");
        return new Error("Max retries reached");
      }
      const delay = Math.min(retries * 200, 5000);
      if (retries % 10 === 0) {
        log("[REDIS] Reconnecting... attempt", retries);
      }
      return delay;
    }
  },
  pingInterval: 30000,
}).on("error", async () => {
  log("[REDIS] Error:", "Redis server has crashed");
  await delay(5000);
}).on("reconnecting", async () => {
  log("[REDIS] Reconnecting...");
  await delay(5000);
}).on("ready", () => {
  log("[REDIS] Connection restored");
}).connect().catch((err) => {
  console.error("[REDIS] Failed to connect:", err?.message || err);
  process.exit(1);
});

log("[REDIS] Connected");

await loadPlugins();

const msgRetryCounterCache = new NodeCache();

const Client = async (phone = process.argv?.[2]) => {
  if (!phone) throw new Error("Phone number is required");

  log("[CLIENT]", phone, "initializing...");

  const { state, saveCreds } = await useHybridAuthState(redis, phone);

  const sock = makeWASocket({
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      return getMessage(phone, key);
    },
    cachedGroupMetadata: async (jid) => {
      return cachedGroupMetadata(phone, jid);
    },
  });

  if (!sock.authState?.creds?.registered) {
    await delay(5000);
    log("[CLIENT]", phone, "not registered, requesting pairing code...");
    const code = await sock.requestPairingCode(phone);
    log("[CLIENT]", phone, "PAIR CODE:", code);
    socketOut("PAIRING_CODE", { code });
  }

  sock.ev.process(async (events) => {
    if (events["connection.update"]) {
      const update = events["connection.update"];
      const { connection, lastDisconnect } = update;

      if (connection === "close") {
        if (
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {
          socketOut("CONNECTION_UPDATE", { status: "needs_restart", phone });
          log("[CLIENT]", phone, "disconnected, restarting in 10s...");
          await delay(10000);
          Client();
        } else {
          socketOut("CONNECTION_UPDATE", { status: "logged_out", phone });
          log("[CLIENT]", phone, "logged out");
        }
      }
      if (connection === "open") {
        socketOut("CONNECTION_UPDATE", { status: "connected", phone });
        log("[CLIENT]", phone, "connected");
        await delay(15000);
        await syncGroupMetadata(phone, sock);
        await SessionManager.set({
          id: phone,
          status: SessionStatus.CONNECTED,
          name: sock.user?.name,
          isBusinessAccount: await sock
            .getBusinessProfile(sock.user?.id)
            .then((r) => !!r)
            .catch(() => false),
          profileUrl: await sock
            .profilePictureUrl(sock.user?.id, "preview")
            .catch(() => null),
          createdAt: new Date(),
        });
      }
    }
    if (events["creds.update"]) {
      await saveCreds();
    }

    if (events["messages.upsert"]) {
      const { messages } = events["messages.upsert"];
      for (const msg of messages) {
        await saveMessage(msg, phone);

        const msgCopy = structuredClone(msg);
        const m = await serialize({ ...msgCopy, session: phone }, sock);
        await Promise.allSettled([
          handleCommand(m),
          handleEvent(m),
          DevicesManager.set({
            sessionId: phone,
            User: isPnUser(m.sender) ? m.sender : m.senderAlt,
            deviceInfo: getDevice(m.key.id),
            lastSeenAt: new Date(),
            createdAt: new Date(),
          }),
        ]);
      }
    }

    if (events["group-participants.update"]) {
      const { id, participants, action } = events["group-participants.update"];
      const firstParticipant = participants[0];
      if (
        action === "remove" &&
        firstParticipant &&
        sock.user?.lid &&
        firstParticipant.id === jidNormalizedUser(sock.user.lid)
      ) {
        return;
      }
      const metadata = await sock.groupMetadata(id);
      await cacheGroupMetadata(phone, metadata);
      await syncGroupParticipantsToContactList(phone, metadata);
    }

    if (events["groups.upsert"]) {
      const groups = events["groups.upsert"];
      for (const group of groups) {
        try {
          const metadata = await sock.groupMetadata(group.id);
          await cacheGroupMetadata(phone, metadata);
        } catch (e) {
          log("[ERROR]", phone, "groups.upsert:", e.message);
        }
      }
    }

    if (events["groups.update"]) {
      const updates = events["groups.update"];
      for (const update of updates) {
        try {
          if (update.id) {
            const metadata = await sock.groupMetadata(update.id);
            await cacheGroupMetadata(phone, metadata);
            await syncGroupParticipantsToContactList(phone, metadata);
          }
        } catch (e) {
          log("[ERROR]", phone, "groups.update:", e.message);
        }
      }
    }
  });

  return sock;
};

Client();
