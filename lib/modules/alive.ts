import type { CommandProperty } from "..";
import { getAliveMessage, setAliveMessage } from "../sql";
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

export default {
  pattern: "alive",
  category: "util",
  async exec(msg, sock, args) {
    if (args) {
      // Set new alive message
      setAliveMessage(msg.sessionId, args);
      return await msg.reply("```Alive message updated```");
    } else {
      // Get and send alive message
      const storedMessage = getAliveMessage(msg.sessionId);
      const message = storedMessage || `Hey! I'm alive and running ${config.BOT_NAME}`;

      const processedMessage = replacePlaceholders(
        message,
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
} satisfies CommandProperty;
