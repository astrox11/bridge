import type { Command } from ".";

export default {
  pattern: "revoke",
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg) => {
    await msg.client.groupRevokeInvite(msg.chat);
    return await msg.send(
      "```Group invite link has been revoked and reset.```",
    );
  },
} satisfies Command;
