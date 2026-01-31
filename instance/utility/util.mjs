import { findCommand, getAllEvents } from "../plugins/index.mjs";
import { getAlternateId } from "../sql";
import { to_small_caps } from "../pkg/util";

import * as net from "net";
import { create, toBinary } from "@bufbuild/protobuf";
import { WorkerEventSchema } from "../proto";

const port = parseInt(process.argv[3]);
let socket = null;

if (port) {
  socket = net.createConnection({ port: port, host: "127.0.0.1" });
  socket.on("error", (e) => console.error("TCP Connection Error:", e.message));
  socket.on("connect", () => console.log(`Connected to Rust on port ${port}`));
}

export const socketOut = (tag, data) => {
  if (!socket || socket.destroyed) return;

  let event;
  if (
    tag === "CONNECTION_UPDATE" ||
    tag === "PAIRING_CODE" ||
    tag === "QR_CODE"
  ) {
    event = create(WorkerEventSchema, {
      event: {
        case: "connection",
        value: {
          phone: process.argv[2],
          status: data.status || tag,
          qr: data.qr,
          pairingCode: data.code,
        },
      },
    });
  } else {
    event = create(WorkerEventSchema, {
      event: {
        case: "rawLog",
        value: JSON.stringify(data),
      },
    });
  }

  const bytes = toBinary(WorkerEventSchema, event);

  const header = Buffer.alloc(4);
  header.writeUInt32BE(bytes.length, 0);

  socket.write(Buffer.concat([header, bytes]));
};

export const handleCommand = async (msg) => {
  if (!msg?.text) return;

  const args = msg.text?.split(" ").slice(1).join(" ");

  const cmd = findCommand(msg.text.split(" ")[0]?.toLowerCase());

  if (!cmd) return;

  return vaildateCmd(cmd, msg) || (await cmd?.function(msg, args));
};

const vaildateCmd = function (cmd, msg) {
  if (cmd?.isGroup && !msg.isGroup) return msg.send("```For Groups Only```");

  if (cmd?.isAdmin && !msg.isAdmin) return msg.send("```For Admins Only```");

  if (cmd?.fromMe && !msg.key.fromMe)
    return msg.send("```For Bot Owner Only```");
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
            console.error("JID Lookup Error:", e.message);
            return null;
          },
        ),
        getAlternateId(msg.session, `${args}@lid`).catch((e) => {
          console.error("LID Lookup Error:", e.message);
          return null;
        }),
      ]);
      return jidResult || lidResult || undefined;
    } catch (e) {
      console.error("Critical error during lookup block:", e);
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
