import { findCommand, getAllEvents } from "../plugins";
import config from "../config";
export const logForGo = (tag, data) => {
    const output = {
        tag: tag,
        timestamp: new Date().toISOString(),
        payload: data,
    };
    console.log(`[GO_DATA] ${JSON.stringify(output)}`);
};
export const handleCommand = async (msg) => {
    if (!msg?.text)
        return;
    const args = msg.text?.split(" ")[1];
    const cmd = findCommand(msg.text);
    if (!cmd)
        return;
    return commandVaildator(cmd, msg) || (await cmd?.function(msg, args));
};
const commandVaildator = function (cmd, msg) {
    if (cmd?.isGroup && !msg.isGroup)
        return msg.send("```For Groups Only```");
    if (cmd?.isAdmin && !msg.isAdmin)
        return msg.send("```For Admins Only```");
    if (cmd?.fromMe && !msg.key.fromMe)
        return msg.send("```For Bot Owner Only```");
};
export const handleEvent = async (msg) => {
    const commands = getAllEvents();
    for (const cmd of commands) {
        await cmd?.function(msg);
    }
};
export const parseId = function (msg, args) {
    if (args)
        return args; /// sominbrr
    if (msg?.quoted)
        return msg?.quoted?.sender;
};
export const parseEnv = (buffer) => {
    const lines = buffer.toString().split(/\r?\n/);
    const result = {};
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        const [key, ...values] = trimmed.split("=");
        const value = values.join("=").trim();
        if (key) {
            result[key.trim()] = value.replace(/^['"]|['"]$/g, "");
        }
    }
    return result;
};
export const makeQuery = async (path, type, body) => {
    const PORT = config.PORT || 8080;
    const BASE_URL = `http://127.0.0.1:${PORT}/api`;
    try {
        const options = {
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
    }
    catch (error) {
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
export function toSmallCaps(text) {
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
