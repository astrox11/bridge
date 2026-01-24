import type { Command } from ".";

export default [
  {
    pattern: "mute",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      await msg.client.groupSettingUpdate(msg.chat, "announcement");
      return await msg.send(
        "```Group muted. Only admins can send messages.```",
      );
    },
  },
  {
    pattern: "unmute",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      await msg.client.groupSettingUpdate(msg.chat, "not_announcement");
      return await msg.send(
        "```Group unmuted. All participants can send messages.```",
      );
    },
  },
] satisfies Command[];
