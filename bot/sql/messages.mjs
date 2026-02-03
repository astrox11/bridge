import { MessageManager } from "./index.mjs";

export const saveMessage = async (msg, sessionPhone) => {
  const m = JSON.stringify(msg);

  await MessageManager.set({
    sessionId: sessionPhone,
    messageId: msg.key.id,
    messageContent: m,
    createdAt: new Date(),
  });
};

export async function getMessage(session, key) {
  const m = await MessageManager.get(session);
  if (m != null) {
    for (const msg of m) {
      if (msg.messageId === key.id) {
        const content = JSON.parse(msg.messageContent || "{}");
        return content.message || undefined;
      }
    }
  }
}
