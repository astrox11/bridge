import os from "os";
import { getAllCommands } from ".";
import { toSmallCaps } from "../utility";
import config from "../config.mjs";

export default [
  {
    pattern: "menu",
    alias: ["help", "list"],
    category: "system",
    function: async (message) => {
      const allCommands = getAllCommands();
      const categories = {};
      let totalMenuCommands = 0;

      allCommands.forEach((cmd) => {
        if (!cmd.pattern || cmd.dontAddToCommandList) return;
        const category = cmd.category || "misc";
        if (!categories[category]) categories[category] = [];
        categories[category].push(cmd.pattern);
        totalMenuCommands++;
      });

      const formatRuntime = () => {
        const uptime = process.uptime();
        const d = Math.floor(uptime / (3600 * 24));
        const h = Math.floor((uptime % (3600 * 24)) / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);

        const parts = [];
        if (d > 0) parts.push(`${d}d`);
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);
        if (s > 0 || parts.length === 0) parts.push(`${s}s`);
        return parts.join(" ");
      };

      const fetchInstanceStats = async () => {
        try {
          const port = config.PORT || "8080";
          const phone = message.session;
          const response = await fetch(
            `http://127.0.0.1:${port}/api/instances/${phone}/stats`
          );
          if (response.ok) {
            return await response.json();
          }
        } catch {
          // Fallback to zeros if stats endpoint is unavailable
        }
        return { cpu_usage: 0, memory_percent: 0 };
      };

      const pushName = message.pushName?.replace(/[\r\n]+/gm, "");
      const runtimeStr = formatRuntime();
      const platformStr = os.platform();
      const stats = await fetchInstanceStats();
      const ramPercent = stats.memory_percent?.toFixed(1) || "0.0";
      const cpuPercent = stats.cpu_usage?.toFixed(1) || "0.0";
      const botName = (config.BOT_NAME || "Whatsaly").toUpperCase();

      let menu = `\`\`\`╭━━━〔 ${botName} 〕━━━`;
      if (pushName) menu += `\n│ User : ${pushName}`;
      menu += `\n│ Plugins : ${totalMenuCommands}`;
      if (runtimeStr) menu += `\n│ Runtime : ${runtimeStr}`;
      if (platformStr) menu += `\n│ Platform : ${platformStr}`;
      menu += `\n│ Ram : ${ramPercent}%`;
      menu += `\n│ Cpu : ${cpuPercent}%`;
      menu += `\n╰──────────────\`\`\`\n`;

      let commandIndex = 1;
      for (const category in categories) {
        const categoryTitle = toSmallCaps(category.toUpperCase());
        if (!categoryTitle) continue;

        menu += `╭─────────────\n│ 「 *${categoryTitle}* 」\n`;

        for (const pattern of categories[category]) {
          const cmdPattern = toSmallCaps(pattern.toLowerCase());
          if (cmdPattern) {
            menu += `│ ${commandIndex++}. ${cmdPattern}\n`;
          }
        }

        menu += `╰──────────────\n`;
      }

      return await message.reply(menu.trim());
    },
  },
  {
    pattern: "ping",
    alias: ["speed"],
    category: "system",
    fromMe: false,
    function: async (message) => {
      const start = Date.now();
      const msg = await message.send("Pong!");
      const end = Date.now();
      const latency = end - start;
      await msg?.edit(`\`\`\`${latency} ms\`\`\``);
    },
  },
  {
    pattern: "uptime",
    alias: ["runtime"],
    category: "system",
    function: async (message) => {
      let totalSeconds = Math.floor(process.uptime());
      const units = [
        { label: "d", seconds: 86400 },
        { label: "h", seconds: 3600 },
        { label: "m", seconds: 60 },
        { label: "s", seconds: 1 },
      ];

      const parts = [];
      for (const unit of units) {
        const value = Math.floor(totalSeconds / unit.seconds);
        if (value > 0) {
          parts.push(`${value}${unit.label}`);
          totalSeconds %= unit.seconds;
        }
      }
      return await message.send(parts.join(" ") || "0s");
    },
  },
];
