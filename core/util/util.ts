import { findCommand, getAllEvents, type Command } from "../plugins";
import type { SerializedMessage } from "../client/seralize";
import config from "../config";
import { getAlternateId } from "../sql/auth";

export const logForGo = (tag: string, data: any) => {
  const output = {
    tag: tag,
    timestamp: new Date().toISOString(),
    payload: data,
  };
  console.log(`[GO_DATA] ${JSON.stringify(output)}`);
};

export const handleCommand = async (msg: SerializedMessage) => {
  if (!msg?.text) return;

  const prefix = null;

  const args = msg.text?.split(" ").slice(1).join(" ");

  const cmd = findCommand(msg.text.split(" ")[0]);

  if (!cmd) return;

  return commandVaildator(cmd, msg) || (await cmd?.function(msg, args));
};

const commandVaildator = function (cmd: Command, msg: SerializedMessage) {
  if (cmd?.isGroup && !msg.isGroup) return msg.send("```For Groups Only```");

  if (cmd?.isAdmin && !msg.isAdmin) return msg.send("```For Admins Only```");

  if (cmd?.fromMe && !msg.key.fromMe)
    return msg.send("```For Bot Owner Only```");
};

export const handleEvent = async (msg: SerializedMessage) => {
  const commands = getAllEvents();

  for (const cmd of commands) {
    await cmd?.function(msg);
  }
};

export const parseId = async function (
  msg: SerializedMessage,
  args?: string,
): Promise<string | undefined> {
  console.log("parseId initiated", {
    hasArgs: !!args,
    hasQuoted: !!msg?.quoted,
  });

  if (args) {
    const cleanArgs = args.replace(/\D/g, "");
    if (!cleanArgs) return undefined;

    try {
      const [jidResult, lidResult] = await Promise.all([
        getAlternateId(msg.session, `${cleanArgs}@s.whatsapp.net`).catch(
          (e) => {
            console.error("JID Lookup Error:", e.message);
            return null;
          },
        ),
        getAlternateId(msg.session, `${cleanArgs}@lid`).catch((e) => {
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

export const parseEnv = (buffer: Buffer) => {
  const lines = buffer.toString().split(/\r?\n/);
  const result: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key, ...values] = trimmed.split("=");
    const value = values.join("=").trim();

    if (key) {
      result[key.trim()] = value.replace(/^['"]|['"]$/g, "");
    }
  }

  return result;
};

export const makeQuery = async (
  path: string,
  type: "POST" | "GET",
  body?: Record<string, any>,
) => {
  const PORT = config.PORT || 8080;
  const BASE_URL = `http://127.0.0.1:${PORT}/api`;

  try {
    const options: RequestInit = {
      method: type,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (type === "POST" && body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE_URL}/${path.replace(/^\//, "")}`, options);

    if (!res.ok) {
      return null;
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }

    return null;
  } catch (error) {
    return null;
  }
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

export function toSmallCaps(text: string): string {
  const smallCaps = [
    "ᴀ",
    "ʙ",
    "ᴄ",
    "ᴅ",
    "ᴇ",
    "ғ",
    "ɢ",
    "ʜ",
    "ɪ",
    "ᴊ",
    "ᴋ",
    "ʟ",
    "ᴍ",
    "ɴ",
    "ᴏ",
    "ᴘ",
    "ǫ",
    "ʀ",
    "s",
    "ᴛ",
    "ᴜ",
    "ᴠ",
    "ᴡ",
    "x",
    "ʏ",
    "ᴢ",
  ];
  return text
    .toUpperCase()
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      return code >= 65 && code <= 90 ? smallCaps[code - 65] : c;
    })
    .join("");
}
