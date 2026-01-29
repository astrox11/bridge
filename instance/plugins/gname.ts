import type { Command } from ".";

export default {
  pattern: "gname",
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg, args) => {
    if (!args) return msg.send("```Provide a new name for the group```");

    await msg.client.groupUpdateSubject(msg.chat, args);
    return await msg.send(`\`\`\`Group name updated to: ${args}\`\`\``);
  },
} satisfies Command;
