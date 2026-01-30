import { Command } from ".";

export default [
  {
    pattern: "archive",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.archiveChat(true);
      return await msg.send("```Chat archived successfully.```");
    },
  },
  {
    pattern: "unarchive",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.archiveChat(false);
      return await msg.send("```Chat unarchived successfully.```");
    },
  },
  {
    pattern: "clear",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.clearChat();
      return await msg.send("```Chat cleared.```");
    },
  },
  {
    pattern: "edit",
    fromMe: true,
    category: "p2p",
    function: async (msg, args) => {
      if (!msg?.quoted || !msg?.quoted?.key?.fromMe)
        return msg.reply("```Reply your own message```");
      await msg.edit(args);
    },
  },
  {
    pattern: "pin",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.pinChatorMsg(true);
    },
  },
  {
    pattern: "unpin",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.pinChatorMsg(false);
    },
  },
  {
    pattern: "star",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.starMessage(true);
      return await msg.send("```Message starred.```");
    },
  },
  {
    pattern: "unstar",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      const quoted = msg.quoted;
      if (!quoted)
        return await msg.send("```Reply to a message to unstar it.```");

      await msg.client.chatModify(
        {
          star: {
            messages: [{ id: quoted.key.id!, fromMe: quoted.key.fromMe }],
            star: false,
          },
        },
        msg.chat,
      );
      return await msg.send("```Message unstarred.```");
    },
  },
] satisfies Command[];
