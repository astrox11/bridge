import type { Command } from ".";

export default {
  pattern: "requests",
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg) => {
    const requests = await msg.client.groupRequestParticipantsList(msg.chat);

    if (!requests || requests.length === 0) {
      return await msg.send("```No pending join requests.```");
    }

    let response = "*Pending Join Requests:*\n\n";
    requests.forEach((req, index) => {
      response += `${index + 1}. @${req.jid.split("@")[0]}\n`;
    });

    return await msg.client.sendMessage(msg.chat, {
      text: response,
      mentions: requests.map((r) => r.jid),
    });
  },
} satisfies Command;
