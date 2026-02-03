export default [
  {
    pattern: "archive",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.archiveChat(true);
      return await msg.reply("```Chat archived successfully.```");
    },
  },
  {
    pattern: "unarchive",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.archiveChat(false);
      return await msg.reply("```Chat unarchived successfully.```");
    },
  },
  {
    pattern: "clear",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.clearChat();
      return await msg.reply("```Chat cleared.```");
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
      return await msg.reply("```Message starred.```");
    },
  },
  {
    pattern: "unstar",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      const quoted = msg.quoted;
      if (!quoted)
        return await msg.reply("```Reply to a message to unstar it.```");

      await msg.client.chatModify(
        {
          star: {
            messages: [{ id: quoted.key.id, fromMe: quoted.key.fromMe }],
            star: false,
          },
        },
        msg.chat,
      );
      return await msg.reply("```Message unstarred.```");
    },
  },
  {
    pattern: "vv",
    fromMe: true,
    function: async (msg) => {
      const { mtype, message } = msg.quoted || {};

      if (!msg?.quoted?.viewonce)
        return msg.reply("```Reply to a view once message```");

      if (message?.[mtype]) message[mtype].viewOnce = false;

      await msg.forward(msg.chat, { quoted: msg.quoted });
    },
  },
  {
    pattern: "save",
    fromMe: true,
    function: async (msg) => {
      if (!msg?.quoted) return msg.reply("```Reply a message to save```");

      await msg.forward(msg.client.user.id, { quoted: msg.quoted });
    },
  },
];
