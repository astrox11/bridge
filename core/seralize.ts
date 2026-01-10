import { getAlternateId } from "./auth";
import {
  jidNormalizedUser,
  normalizeMessageContent,
  type WAContextInfo,
  type WAMessage,
  type WASocket,
} from "baileys";
import { extract_text_from_message, get_content_type } from "./util";

const serialize = async (
  msg: WAMessage & { session: string },
  client: WASocket
) => {
  const { key, message, messageTimestamp } = msg;

  normalizeMessageContent(message);
  const type = get_content_type(message);
  const quoted = (msg.message?.[type as keyof typeof msg.message] as any)
    ?.contextInfo as any as WAContextInfo | undefined;

  const quotedMessage = quoted?.quotedMessage;
  const quotedType = quotedMessage ? get_content_type(quotedMessage) : null;

  const isGroup = key.remoteJid!.endsWith("@g.us");
  const sender = !isGroup
    ? !key.fromMe
      ? key.remoteJid
      : jidNormalizedUser(client.user?.id)
    : key.participant;

  const senderAlt = await getAlternateId(sender!, msg.session);
  const session = msg.session;

  return {
    chat: key.remoteJid,
    key,
    message,
    type,
    sender,
    senderAlt,
    session,
    isGroup,
    messageTimestamp,
    text: extract_text_from_message(message),
    quoted:
      quoted && quotedMessage && quotedType
        ? {
            key: {
              remoteJid: key.remoteJid,
              remoteJidAlt: key.remoteJidAlt,
              id: quoted.stanzaId,
              fromMe: [
                quoted.participant,
                await getAlternateId(quoted.participant!, msg.session),
              ].includes(jidNormalizedUser(client.user!.id)),
            },
            sender: quoted.participant,
            senderAlt: await getAlternateId(quoted.participant!, msg.session),
            message: quotedMessage,
            type: quotedType,
            text: extract_text_from_message(quotedMessage),
            broadcast: Boolean(quoted?.remoteJid),
            viewonce: (
              quotedMessage[quotedType as keyof typeof quotedMessage] as {
                viewOnce?: boolean;
              }
            )?.viewOnce,
          }
        : undefined,
    reply: async function (text: string) {
      return await client.sendMessage(
        this.chat!,
        { text },
        { quoted: this?.quoted || msg }
      );
    },
    client,
  };
};

export type SerializedMessage = Awaited<ReturnType<typeof serialize>>;
export default serialize;
