import type { Command } from ".";

export default {
  pattern: "approval",
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg, args) => {
    const mode = args?.toLowerCase().trim();

    if (mode === "on") {
      await msg.client.groupSettingUpdate(msg.chat, "membership_approval_mode");
      return await msg.send("```Member approval mode enabled.```");
    }

    if (mode === "off") {
      await msg.client.groupSettingUpdate(
        msg.chat,
        "not_membership_approval_mode",
      );
      return await msg.send("```Member approval mode disabled.```");
    }

    return await msg.send("```Usage: approval on/off```");
  },
} satisfies Command;
