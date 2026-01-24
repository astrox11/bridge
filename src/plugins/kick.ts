import type { Command } from ".";
import { parseId } from "../util";

export default {
  pattern: "kick",
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg, args) => {
    const user = await parseId(msg, args);

    if (!user)
      return msg.send("```Provide a user to kick (reply or mention)```");

    await msg.client.groupParticipantsUpdate(msg.chat, [user], "remove");
    return await msg.client.sendMessage(msg.chat, {
      text: `\`\`\`@${user.split("@")[0]} has been removed from the group.\`\`\``,
      mentions: [user],
    });
  },
} satisfies Command;
