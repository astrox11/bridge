import type { Command } from ".";

export default {
  pattern: "gdesc",
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg, args) => {
    if (!args) return msg.send("```Provide a new description```");

    await msg.client.groupUpdateDescription(msg.chat, args);
    return await msg.send("```Group description updated successfully.```");
  },
} satisfies Command;
