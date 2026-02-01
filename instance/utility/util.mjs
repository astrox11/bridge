import { findCommand, getAllEvents } from "../plugins/index.mjs";
import { getAlternateId } from "../sql";
import { Configuration } from "../sql/configuration.mjs";
import { to_small_caps } from "../pkg/util";

import * as net from "net";
import { WorkerEvent, ConnectionUpdate } from "../proto/index.mjs";

const port = parseInt(process.argv[3]);
let socket = null;

// Logging helper (respects LOGS env)
const log = (...args) => {
  if (process.env.LOGS === 'true') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`  ${time}`, ...args);
  }
};

if (port) {
  socket = net.createConnection({ port: port, host: "127.0.0.1" });
  socket.on("error", (e) => log("[SOCKET] Error:", e.message));
  socket.on("connect", () => log("[SOCKET] Connected to service on port", port));
}

export const socketOut = (tag, data) => {
  if (!socket || socket.destroyed) return;

  let event;
  if (
    tag === "CONNECTION_UPDATE" ||
    tag === "PAIRING_CODE" ||
    tag === "QR_CODE"
  ) {
    const conn = ConnectionUpdate.create({
      phone: process.argv[2],
      status: data.status || tag,
      qr: data.qr || "",
      pairingCode: data.code || "",
    });
    event = WorkerEvent.create({ connection: conn });
    log("[EVENT]", tag, data.status || tag);
  } else {
    event = WorkerEvent.create({ rawLog: JSON.stringify(data) });
  }

  const bytes = WorkerEvent.encode(event).finish();
  const header = Buffer.alloc(4);
  header.writeUInt32BE(bytes.length, 0);

  socket.write(Buffer.concat([header, bytes]));
};

export const handleCommand = async (msg) => {
  if (!msg?.text) return;

  const config = new Configuration(msg.session);
  const prefixes = await config.getPrefix();

  let commandName;
  let args;

  if (prefixes && prefixes.length > 0) {
    const firstChar = msg.text.charAt(0);
    if (prefixes.includes(firstChar)) {
      commandName = msg.text.slice(1).split(" ")[0]?.toLowerCase();
      args = msg.text.split(" ").slice(1).join(" ");
    } else {
      return;
    }
  } else {
    commandName = msg.text.split(" ")[0]?.toLowerCase();
    args = msg.text.split(" ").slice(1).join(" ");
  }

  const cmd = findCommand(commandName);

  if (!cmd) return;

  const validation = await vaildateCmd(cmd, msg, config);
  if (validation) return validation;

  try {
    return await cmd?.function(msg, args);
  } catch (error) {
    log("[CMD ERROR]", error.message);
    const errorText = "```Error\n" + (error.message || String(error)) + "```";
    return await msg.client.sendMessage(msg.client.user.id, { text: errorText });
  }
};

const vaildateCmd = async function (cmd, msg, config) {
  if (cmd?.isGroup && !msg.isGroup) return msg.send("```For Groups Only```");
  if (cmd?.isAdmin && !msg.isAdmin) return msg.send("```For Admins Only```");
  if (cmd?.fromMe && !msg.key.fromMe)
    return msg.send("```For Bot Owner Only```");

  const mode = await config.getMode();
  if (mode === 'private' && !msg.key.fromMe) {
    const sudoUsers = await config.getSudo();
    const sender = msg.sender?.replace(/[^0-9]/g, '');
    const isSudo = sudoUsers.some(id => sender.includes(id));

    if (!isSudo) {
      return msg.send("```Bot is in Private Mode```");
    }
  }
};

export const handleEvent = async (msg) => {
  const commands = getAllEvents();

  for (const cmd of commands) {
    await cmd?.function(msg);
  }
};

export const parseId = async function (msg, args) {
  if (args) {
    args = args.replace(/\D/g, "");
    if (!args) return undefined;

    try {
      const [jidResult, lidResult] = await Promise.all([
        getAlternateId(msg.session, `${args}@s.whatsapp.net`).catch(
          (e) => {
            log("[ERROR] JID Lookup:", e.message);
            return null;
          },
        ),
        getAlternateId(msg.session, `${args}@lid`).catch((e) => {
          log("[ERROR] LID Lookup:", e.message);
          return null;
        }),
      ]);
      return jidResult || lidResult || undefined;
    } catch (e) {
      log("[ERROR] Critical error during lookup:", e.message);
      return undefined;
    }
  }

  if (msg?.quoted) return msg.quoted?.sender ?? undefined;

  return undefined;
};

export const additionalNodes = [
  {
    tag: "biz",
    attrs: {},
    content: [
      {
        tag: "interactive",
        attrs: { type: "native_flow", v: "1" },
        content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
      },
    ],
  },
];

export function toSmallCaps(text) {
  return to_small_caps(text);
}
