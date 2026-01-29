import type { Command } from ".";

export default {
  pattern: "invite",
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg) => {
    const code = await msg.client.groupInviteCode(msg.chat);
    return await msg.send(`https://chat.whatsapp.com/${code}`);
  },
} satisfies Command;
