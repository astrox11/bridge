import { delay } from "baileys";
import { Plugins, type CommandProperty } from "../";
import { exit, startSock } from "../..";

export default [
  {
    pattern: "ping",
    alias: ["speed"],
    category: "util",
    desc: "Check bot response time",
    async exec(msg) {
      const start = Date.now();
      const m = await msg.reply("```pong```");
      const end = Date.now();
      await m.edit(`\`\`\`Pong ${end - start}ms\`\`\``);
    },
  },
  {
    pattern: "menu",
    alias: ["help"],
    category: "util",
    desc: "Display all available commands",
    async exec(msg, sock) {
      const p = new Plugins(msg, sock);
      const commands = p.findAll();
      const categories: Record<string, Set<string>> = {};

      for (const cmd of commands) {
        const cat = cmd.category;
        if (!categories[cat]) categories[cat] = new Set();

        // Add pattern with aliases
        const cmdText =
          cmd.alias && cmd.alias.length > 0
            ? `${cmd.pattern} (${cmd.alias.join(", ")})`
            : cmd.pattern;

        categories[cat].add(cmdText);
      }

      let reply = `ᗰIᗪᗪᒪᗴᗯᗩᖇᗴ ᗰᗴᑎᑌ\n\n`;

      for (const category in categories) {
        reply += `${category.toUpperCase()}\n`;

        for (const pattern of categories[category]) {
          reply += `. ${pattern}\n`;
        }

        reply += `\n`;
      }

      await msg.reply(`\`\`\`${reply.trim()}\`\`\``);
    },
  },
  {
    pattern: "restart",
    alias: ["reboot"],
    category: "util",
    desc: "Restart the bot",
    async exec(msg) {
      await msg.reply("_Restarting_");
      await delay(300);
      startSock();
    },
  },
  {
    pattern: "shutdown",
    alias: ["off"],
    category: "util",
    desc: "Shutdown the bot",
    async exec(msg) {
      await msg.reply("_Shutting down_");
      await delay(300);
      exit();
    },
  },
] satisfies CommandProperty[];
