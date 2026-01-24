import { Command } from ".";

export default {
  pattern: "clear",
  fromMe: true,
  category: "p2p",
  function: async (msg) => {
    await msg.clearChat();
    return await msg.send("```Chat cleared.```");
  },
} satisfies Command;
