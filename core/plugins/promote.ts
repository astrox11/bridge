import type { Command } from ".";
import { parseId } from "../util";

export default {
  pattern: "promote",
  isGroup: true,
  isAdmin: true,
  function: async (msg, args) => {
    const user = await parseId(msg, args);

    if (!user) return msg.send("```Provide user to promote```");

    await msg.client.groupParticipantsUpdate(msg.chat, [user], "promote");
    return await msg.client.sendMessage(msg.chat, {
      text: `\`\`\`@${user.split("@")[0]} is now an admin\`\`\``,
      mentions: [user],
    });
  },
} satisfies Command;
