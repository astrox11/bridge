import type { Command } from ".";

export default {
  pattern: "leave",
  alias: ["left"],
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg) => {
    await msg.send("```Goodbye! Leaving the group...```");
    return await msg.client.groupLeave(msg.chat);
  },
} satisfies Command;
