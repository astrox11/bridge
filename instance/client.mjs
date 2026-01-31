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

const logger = pino({
  level: "silent",
});

const redis = createClient({ url: "redis://localhost:6379" });
redis.on("error", (err) => console.log("Redis Client Error", err));

await redis.connect();
await loadPlugins();

const msgRetryCounterCache = new NodeCache();

const Client = async (phone = process.argv?.[2]) => {
  if (!phone) throw new Error("Phone number is required");

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
    console.log("Client not registered");
    const code = await sock.requestPairingCode(phone);
    console.log("PAIR CODE:", code);
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
          await delay(10000);
          Client();
        } else {
          socketOut("CONNECTION_UPDATE", { status: "logged_out", phone });
          console.log("Connection closed. You are logged out.");
        }
      }
      if (connection === "open") {
        socketOut("CONNECTION_UPDATE", { status: "connected", phone });
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
          console.error(e);
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
          console.error(e);
        }
      }
    }
  });

  return sock;
};

Client();
