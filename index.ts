import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay,
  type CacheStore,
} from "baileys";
import { Boom } from "@hapi/boom";
import MAIN_LOGGER from "pino";
import NodeCache from "@cacheable/node-cache";
import {
  log,
  parseEnv,
  getMessage,
  findEnvFile,
  Message,
  Plugins,
  useBunqlAuth,
  cachedGroupMetadata,
} from "./lib";
import parsePhoneNumberFromString, {
  isValidPhoneNumber,
} from "libphonenumber-js";

const msgRetryCounterCache = new NodeCache() as CacheStore;
const logger = MAIN_LOGGER({ level: "silent" });
const config = findEnvFile("./");
const phone = parseEnv(config || "").PHONE_NUMBER?.replace(/\D+/g, "");

const start = async () => {
  if (!isValidPhoneNumber(`+${phone}`)) {
    return log.error("Invalid PHONE_NUMBER in .env file");
  }

  const country = parsePhoneNumberFromString(`+${phone}`)?.country;
  const { state, saveCreds } = await useBunqlAuth();
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    getMessage,
    cachedGroupMetadata,
    generateHighQualityLinkPreview: true,
  });

  if (!sock.authState.creds.registered) {
    log.info(
      `${country} Phone number not registered. Requesting pairing code...`,
    );
    await delay(10000);
    const code = await sock.requestPairingCode(phone);
    log.info(`Code: ${code.slice(0, 4)}-${code.slice(4)}`);
  }

  sock.ev.process(async (events) => {
    if (events["connection.update"]) {
      const update = events["connection.update"];
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        if (
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {
          start();
        } else {
          log.error("Connection closed. You are logged out.");
        }
      }
    }

    if (events["creds.update"]) {
      await saveCreds();
    }

    if (events["messages.upsert"]) {
      const { messages } = events["messages.upsert"];
      for (const msg of messages) {
        const m = new Message(sock, msg);
        const p = new Plugins(m, sock);
        await p.load("./lib/modules");
        p.text();
        p.sticker();
        p.event();
      }
    }
  });
};

start();
