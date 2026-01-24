import { Command } from ".";

export default {
  pattern: "edit",
  fromMe: true,
  category: "p2p",
  function: async (msg, args) => {
    if (!msg?.quoted || !msg?.quoted?.key?.fromMe)
      return msg.reply("```Reply your own message```");
    await msg.edit(args);
  },
} satisfies Command;
