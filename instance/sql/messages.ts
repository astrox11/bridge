import type { WAMessage, WAMessageKey } from "baileys";
import { MessageManager } from ".";

export const saveMessage = async (msg: WAMessage, sessionPhone: string) => {
  const m = JSON.stringify(msg);

  await MessageManager.set({
    sessionId: sessionPhone,
    messageId: msg.key.id as string,
    messageContent: m,
    createdAt: new Date(),
  });
};

export async function getMessage(session: string, key: WAMessageKey) {
  const id = key.id as string;

  const m = await MessageManager.get(session);
  if (m != null) {
    for (const msg of m) {
      if (msg.messageId === id) {
        const content: WAMessage = JSON.parse(msg.messageContent || "{}");
        return content.message || undefined;
      }
    }
  }
}
