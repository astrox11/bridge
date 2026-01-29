import type { Command } from ".";

export default {
  pattern: "ginfo",
  alias: ["groupinfo"],
  category: "group",
  isGroup: true,
  function: async (msg) => {
    const metadata = await msg.client.groupMetadata(msg.chat);
    const creationDate = new Date(metadata.creation! * 1000).toLocaleString();

    const info = `*Group Name:* ${metadata.subject}
*Group ID:* ${metadata.id}
*Owner:* ${metadata.owner ? "@" + metadata.owner.split("@")[0] : "System"}
*Created On:* ${creationDate}
*Participants:* ${metadata.participants.length}
*Description:* ${metadata.desc || "No description"}`;

    return await msg.client.sendMessage(msg.chat, {
      text: info,
      mentions: metadata.owner ? [metadata.owner] : [],
    });
  },
} satisfies Command;
