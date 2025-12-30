import type { CommandProperty } from "..";
import { getMentionMessage, setMentionMessage } from "../sql";
import config from "../../config";

/**
 * Replace placeholders in message
 */
function replacePlaceholders(
  message: string,
  sender: string,
  ownerId: string,
  botName: string,
): string {
  return message
    .replace(/@user/g, sender.split("@")[0])
    .replace(/@owner/g, ownerId.split("@")[0])
    .replace(/@botname/g, botName);
}

export default [
  {
    pattern: "mention",
    category: "groups",
    isGroup: true,
    async exec(msg, sock, args) {
      if (args) {
        // Set mention message for this group
        setMentionMessage(msg.sessionId, msg.chat, args);
        return await msg.reply("```Mention message set for this group```");
      } else {
        // Send mention message
        const storedMessage = getMentionMessage(msg.sessionId, msg.chat);

        if (!storedMessage) {
          return await msg.reply("```No mention message set for this group```");
        }

        const processedMessage = replacePlaceholders(
          storedMessage,
          msg.sender,
          sock.user.id,
          config.BOT_NAME,
        );

        await sock.sendMessage(msg.chat, {
          text: processedMessage,
          mentions: [msg.sender],
        });
      }
    },
  },
] satisfies CommandProperty[];
