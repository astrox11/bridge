import { formatRuntime, Plugins, type CommandProperty } from "..";
import os from "os";

function formatp(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)} ${sizes[i]}`;
}

function toSmallCaps(text: string): string {
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
      if (code >= 65 && code <= 90) return smallCaps[code - 65];
      return c;
    })
    .join("");
}

export default [
  {
    pattern: "menu",
    dontAddToCommandList: true,
    async exec(msg, sock) {
      const p = new Plugins(msg, sock);
      const commands = p.findAll();

      if (commands.length === 0)
        return await msg.reply("```No commands available```");

      const categories: Record<string, Set<string>> = {};

      for (const cmd of commands) {
        if (cmd.dontAddToCommandList === true) continue;
        if (cmd.pattern === "help") continue;
        const cat = cmd.category;
        if (!categories[cat]) categories[cat] = new Set();
        categories[cat].add(cmd.pattern);
      }

      if (Object.keys(categories).length === 0)
        return await msg.reply("```No commands available```");

      let reply = `\`\`\`┃╭──────────────
┃│ Owner : ${sock.user.name}
┃│ User : ${msg.pushName}
┃│ Plugins : ${commands.length}
┃│ Runtime : ${formatRuntime(process.uptime())}
┃│ Mode : ${msg.mode}
┃│ Platform : ${os.platform()}
┃│ Ram : ${formatp(os.totalmem() - os.freemem())} / ${formatp(os.totalmem())}
┃╰──────────────
╰━━━━━━━━━━━━━━━
\`\`\``;

      for (const category in categories) {
        reply += `╭─────────────\n`;
        reply += `│ 「 *${toSmallCaps(category)}* 」 \n`;
        reply += `╰┬────────────\n┌┤\n`;

        for (const plugin of categories[category]) {
          reply += `││◦ ${toSmallCaps(plugin)}\n`;
        }

        reply += `│╰────────────\n`;
        reply += `╰─────────────\n`;
      }

      await msg.send(
        {
          text: reply.trim(),
          title: "╭━━━〔 αѕтяσχ вσт 〕━━━",
          buttons: [
            {
              buttonId: "0",
              type: 1,
              buttonText: {
                displayText: "αѕтяσχ ѕυρρσят",
              },
            },
          ],
        },
        { type: "buttons" },
      );
    },
  },
  {
    pattern: "help",
    category: "util",
    dontAddToCommandList: true,
    async exec(msg, sock) {
      const p = new Plugins(msg, sock);
      const commands = p.findAll();

      if (commands.length === 0)
        return await msg.reply("```No commands available```");

      let reply = "";

      for (const cmd of commands) {
        if (cmd.dontAddToCommandList === true) continue;
        reply += `command : ${cmd.pattern}\n`;
        reply += `alias : ${cmd.alias && cmd.alias.length > 0 ? cmd.alias.join(", ") : "-"}\n\n`;
      }

      await msg.send(
        {
          text: reply.trim(),
          buttons: [
            {
              buttonId: "0",
              type: 1,
              buttonText: {
                displayText: "αѕтяσχ ѕυρρσят",
              },
            },
          ],
        },
        { type: "buttons" },
      );
    },
  },
] satisfies CommandProperty[];
