import { getAlternateId } from "auth";
import {
  getContentType,
  jidNormalizedUser,
  normalizeMessageContent,
  type WAContextInfo,
  type WAMessage,
  type WASocket,
} from "baileys";

const serialize = async (
  msg: WAMessage & { session: string },
  client: WASocket
) => {
  const { key, message, messageTimestamp } = msg;

  normalizeMessageContent(message);
  const type = getContentType(message!);
  const quoted = (msg.message?.[type!] as any)?.contextInfo as any as
    | WAContextInfo
    | undefined;

  const quotedMessage = quoted?.quotedMessage;
  const quotedType = quotedMessage ? getContentType(quotedMessage) : null;

  const isGroup = key.remoteJid!.endsWith("@g.us");
  const sender = !isGroup
    ? !key.fromMe
      ? key.remoteJid
      : jidNormalizedUser(client.user?.id)
    : key.participant;

  return {
    chat: key.remoteJid, 
    key,
    message,
    type,
    sender: sender,
    senderAlt: await getAlternateId(sender!, msg.session),
    session: msg.session,
    isGroup,
    timestamp: messageTimestamp,
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
            broadcast: Boolean(quoted?.remoteJid),
            viewonce: (quotedMessage[quotedType] as { viewOnce?: boolean })
              ?.viewOnce,
          }
        : undefined,
    client,
  };
};

export type SerializedMessage = Awaited<ReturnType<typeof serialize>>;
export default serialize;
