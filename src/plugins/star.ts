import type { Command } from ".";

export default [
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
