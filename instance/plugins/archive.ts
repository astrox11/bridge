import type { Command } from ".";

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
] satisfies Command[];
