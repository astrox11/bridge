import type { Command } from ".";
import { WA_DEFAULT_EPHEMERAL } from "baileys";

export default {
  pattern: "ephemeral",
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg, args) => {
    const mode = args?.toLowerCase().trim();

    if (mode === "on") {
      await msg.client.sendMessage(msg.chat, {
        disappearingMessagesInChat: WA_DEFAULT_EPHEMERAL,
      });
      return await msg.send("```Disappearing messages enabled (24 hours).```");
    }

    if (mode === "off") {
      await msg.client.sendMessage(msg.chat, {
        disappearingMessagesInChat: false,
      });
      return await msg.send("```Disappearing messages disabled.```");
    }

    return await msg.send("```Usage: ephemeral on/off```");
  },
} satisfies Command;
