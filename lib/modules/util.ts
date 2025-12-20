import { formatRuntime, type CommandProperty } from "../";

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
      await m.edit(`${end - start}ms`);
    },
  },
  {
    pattern: "runtime",
    alias: ["uptime"],
    category: "util",
    desc: "Check process uptime",
    async exec(msg) {
      const time = formatRuntime(process.uptime());
      return await msg.reply("```" + time + "```");
    },
  },
] satisfies Array<CommandProperty>;
