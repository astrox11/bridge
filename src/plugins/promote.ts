import type { Command } from ".";
import { isAdmin } from "../sql";
import { parseId } from "../util";

export default {
  pattern: "promote",
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg, args) => {
    const user = await parseId(msg, args);

    if (!user) return msg.send("```Provide user to promote```");

    const isAlreadyAdmin = await isAdmin(msg.session, msg.chat, user);

    if (isAlreadyAdmin) return msg.send("```User is already an admin```");

    await msg.client.groupParticipantsUpdate(msg.chat, [user], "promote");
    return await msg.client.sendMessage(msg.chat, {
      text: `\`\`\`@${user.split("@")[0]} is now an admin\`\`\``,
      mentions: [user],
    });
  },
} satisfies Command;
