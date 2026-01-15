import type { Command } from ".";

export default {
  pattern: "ping",
  alias: ["speed"],
  fromMe: false,
  function: async (message) => {
    const start = Date.now();
    const msg = await message.send("Pong!");
    const end = Date.now();
    const latency = end - start;
    await msg?.edit(`\`\`\`${latency} ms\`\`\``);
  },
} satisfies Command;
