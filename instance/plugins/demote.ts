import type { Command } from ".";
import { isAdmin } from "../sql";
import { parseId } from "../utility";

export default {
  pattern: "demote",
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg, args) => {
    const user = await parseId(msg, args);

    if (!user) return msg.send("```Provide user to demote```");

    const isAlreadyAdmin = await isAdmin(msg.session, msg.chat, user);

    if (!isAlreadyAdmin) return msg.send("```User wasn't an admin```");

    await msg.client.groupParticipantsUpdate(msg.chat, [user], "demote");
    return await msg.client.sendMessage(msg.chat, {
      text: `\`\`\`@${user.split("@")[0]} is no longer an admin\`\`\``,
      mentions: [user],
    });
  },
} satisfies Command;
