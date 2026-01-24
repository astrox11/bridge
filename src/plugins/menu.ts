import os from "os";
import { Command, getAllCommands } from "./index";
import { toSmallCaps } from "../util";

export default {
  pattern: "menu",
  alias: ["help", "list"],
  category: "system",
  function: async (message) => {
    const allCommands = getAllCommands();
    const categories: Record<string, string[]> = {};
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

      const parts: any[] = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      if (s > 0 || parts.length === 0) parts.push(`${s}s`);
      return parts.join(" ");
    };

    const formatBytes = (bytes: number) => {
      if (bytes <= 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const pushName = message.pushName?.replace(/[\r\n]+/gm, "");
    const runtimeStr = formatRuntime();
    const platformStr = os.platform();
    const ramStr = `${formatBytes(os.totalmem() - os.freemem())} / ${formatBytes(os.totalmem())}`;

    let menu = `\`\`\`╭━━━〔 WHATSALY 〕━━━`;
    if (pushName) menu += `\n│ User : ${pushName}`;
    menu += `\n│ Plugins : ${totalMenuCommands}`;
    if (runtimeStr) menu += `\n│ Runtime : ${runtimeStr}`;
    if (platformStr) menu += `\n│ Platform : ${platformStr}`;
    if (ramStr) menu += `\n│ Ram : ${ramStr}`;
    menu += `\n╰──────────────\`\`\`\n`;

    let commandIndex = 1;
    for (const category in categories) {
      const categoryTitle = toSmallCaps(category.toUpperCase());
      if (!categoryTitle) continue;

      menu += `╭─────────────
│ 「 *${categoryTitle}* 」\n`;

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
} satisfies Command;
