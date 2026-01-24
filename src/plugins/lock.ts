import type { Command } from ".";

export default [
  {
    pattern: "lock",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      await msg.client.groupSettingUpdate(msg.chat, "locked");
      return await msg.send(
        "```Group settings locked. Only admins can edit group info.```",
      );
    },
  },
  {
    pattern: "unlock",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      await msg.client.groupSettingUpdate(msg.chat, "unlocked");
      return await msg.send(
        "```Group settings unlocked. All members can edit group info.```",
      );
    },
  },
] satisfies Command[];
