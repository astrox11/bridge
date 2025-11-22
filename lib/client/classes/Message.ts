import { getContentType, isJidGroup, normalizeMessageContent } from "baileys";
import type { WASocket, WAMessage } from "baileys";

export class Message {
  client: WASocket;
  msg: WAMessage;

  constructor(client: WASocket, message: WAMessage) {
    this.client = client;
    this.msg = message;
  }

  async serialize(msg?: WAMessage) {
    const { key, message: raw, messageTimestamp, pushName } = msg ?? this.msg;
    const message = normalizeMessageContent(raw!);
    const contentType = getContentType(message);
    const isGroup = isJidGroup(key.remoteJid!);
    const sender = !isGroup ? key.remoteJid : key.participant;
    const sender_alt = !isGroup ? key.remoteJidAlt : key.participantAlt;

    const client = this.client;
    const quotedMessage = raw!;
    const remote = key.remoteJid!;
    const sanitize = (t: string) =>
      t
        .replace(/[^a-zA-Z0-9., ]+/g, "")
        .replace(/\s+/g, " ")
        .trim();

    return {
      id: key.remoteJid,
      key,
      message,
      messageTimestamp,
      pushName,
      contentType,
      isGroup,
      sender,
      sender_alt,

      reply: async (text: string) => {
        if (!remote) throw new Error("missing remoteJid");
        const clean = sanitize(text);
        const sent = await client.sendMessage(
          remote,
          { text: clean },
          { quoted: { key, message: quotedMessage } },
        );
        return await new Message(client, sent!).serialize(sent);
      },

      edit: async (text: string) => {
        if (!key?.remoteJid) throw new Error("missing message key.remoteJid");
        const clean = sanitize(text);
        const edited = await client.sendMessage(
          key.remoteJid,
          { text: clean, edit: key },
          { quoted: { key, message: quotedMessage } },
        );
        return await new Message(client, edited!).serialize(edited);
      },
    };
  }

  async reply(text: string) {
    const serialized = await this.serialize();
    return await serialized.reply(text);
  }

  async edit(text: string) {
    const serialized = await this.serialize();
    return await serialized.edit(text);
  }
}
