import type { Command } from ".";

export default {
  pattern: "gpp",
  alias: ["setgpp"],
  category: "group",
  isGroup: true,
  isAdmin: true,
  function: async (msg) => {
    const quoted = msg.quoted;
    if (!quoted || !quoted?.image) {
      return await msg.send(
        "```Reply to an image to set it as the group profile picture.```",
      );
    }

    const stream = await msg.download(quoted);
    await msg.client.updateProfilePicture(msg.chat, stream);
    return await msg.send("```Group profile picture updated successfully.```");
  },
} satisfies Command;
