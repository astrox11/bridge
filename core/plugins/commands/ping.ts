import type { Command } from "../";

export default {
  pattern: "ping",
  alias: ["speed"],
  fromMe: false,
  function: async (message) => {
    const start = Date.now();
    const msg = await message.client.sendMessage(message.chat!, {
      text: "Pong!",
    });
    const end = Date.now();
    const latency = end - start;
    await message.client.sendMessage(message.chat!, {
      edit: msg?.key,
      text: `Latency: ${latency} ms`,
    });
  },
} satisfies Command;
