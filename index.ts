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
  Auth,
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
    log.info(`${country} Phone number not registered. Requesting pairing code...`);
    await delay(10000);
    const code = await sock.requestPairingCode(phone);
    log.info(`Code: ${code.slice(0, 4)}-${code.slice(4)}`);
  }

  sock.ev.on("creds.update", async () => await saveCreds());

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    log.info(`Connection status: ${connection}`);

    if (connection === "open") log.info("Connected successfully!");

    if (connection === "close") {
      const status = (lastDisconnect?.error as Boom)?.output?.statusCode;
      log.info(`Disconnect status: ${status}`);

      if (status === DisconnectReason.restartRequired) {
        log.info(
          "Restart required (expected after pairing). Creating new socket...",
        );
        start();
      } else if (status === DisconnectReason.loggedOut) {
        Auth.delete().where("name", "=", "creds").run();
        log.error(
          "Logged out. Credentials cleared. Please restart and pair again.",
        );
      } else {
        log.info("Unexpected disconnect. Reconnecting...");
        setTimeout(() => start(), 3000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      const m = new Message(sock, msg);
      const p = new Plugins(m, sock);
      await p.load("./lib/modules");
      p.text();
      p.sticker();
      p.event();
    }
  });
};

start();
