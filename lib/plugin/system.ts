import { delay } from "baileys";
import type { CommandProperty } from "../src";
import { exit, startSock } from "../..";

export default [
  {
    pattern: "restart",
    alias: ["reboot"],
    category: "system",
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
    category: "system",
    desc: "Shutdown the bot",
    async exec(msg) {
      await msg.reply("_Shutting down_");
      await delay(300);
      exit();
    },
  },
] satisfies Array<CommandProperty>;
