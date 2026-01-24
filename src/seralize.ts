import type { proto, WAMessage, WASocket } from "baileys";
import { downloadMediaMessage, jidNormalizedUser } from "baileys";
import { isAdmin as admin, getAlternateId } from "./sql";
import { serialize_full, parse_content } from "./pkg";

const serialize = async (
  msg: WAMessage & { session: string },
  client: WASocket,
) => {
  const core = serialize_full(msg);

  const [senderAlt, isAdmin] = await Promise.all([
    getAlternateId(msg.session, core.sender),
    core.is_group ? admin(msg.session, core.chat, core.sender) : null,
  ]);

  if (core.quoted) {
    core.quoted.key.fromMe = [
      core.quoted.sender,
      await getAlternateId(msg.session, core.quoted.sender),
    ].includes(jidNormalizedUser(client.user!.id));
  }

  return {
    ...core,
    key: msg.key,
    message: msg.message,
    session: msg.session,
    senderAlt,
    isAdmin,
    pushName: msg.pushName,
    messageTimestamp: msg.messageTimestamp,

    image: core.media_flags.image,
    video: core.media_flags.video,
    audio: core.media_flags.audio,
    document: core.media_flags.document,
    sticker: core.media_flags.sticker,
    media:
      core.media_flags.image ||
      core.media_flags.video ||
      core.media_flags.audio ||
      core.media_flags.document ||
      core.media_flags.sticker,

    reply: async function (text: string) {
      return await client.sendMessage(this.chat!, { text }, { quoted: msg });
    },

    send: async function (input: any) {
      const content = await parse_content(input);

      const sendMap: Record<string, any> = {
        "text/plain": { text: content.content },
        "image/": { image: { url: content.content } },
        "video/": { video: { url: content.content } },
        "audio/": { audio: { url: content.content } },
      };

      for (const [mime, body] of Object.entries(sendMap)) {
        if (content?.mimeType.startsWith(mime)) {
          const m = (await client.sendMessage(this.chat!, body)) as WAMessage;
          return await serialize({ ...m, session: this.session }, client);
        }
      }
    },

    edit: async function (text: string) {
      const editContent =
        this?.quoted?.image || this.image
          ? { image: { url: "" }, text }
          : this?.quoted?.video || this.video
            ? { video: { url: "" }, text }
            : { text };
      return await client.sendMessage(this.chat!, {
        edit: this?.quoted?.key || this.key,
        ...editContent,
      });
    },

    delete: async function () {
      const targetKey = this.quoted?.key || this.key;
      if (!targetKey.fromMe) {
        return await client.chatModify(
          {
            deleteForMe: {
              key: targetKey,
              timestamp: Number(this.messageTimestamp),
              deleteMedia: this.media,
            },
          },
          this.chat!,
        );
      }
      return await client.sendMessage(this.chat!, { delete: targetKey });
    },

    clearChat: async function () {
      return client.chatModify(
        {
          clear: true,
          lastMessages: [
            { key: this.key, messageTimestamp: this.messageTimestamp },
          ],
        },
        this.chat,
      );
    },
    archiveChat: async function (archive: boolean) {
      return await client.chatModify(
        {
          archive: archive,
          lastMessages: [
            { key: this.key, messageTimestamp: this.messageTimestamp },
          ],
        },
        this.chat,
      );
    },
    starMessage: async function (star: boolean) {
      return await client.chatModify(
        {
          star: {
            messages: [
              {
                id: this?.quoted?.key?.id || this.key.id,
                fromMe: this?.quoted?.key?.fromMe || this.key.fromMe,
              },
            ],
            star,
          },
        },
        this.chat,
      );
    },
    recordContact: async function (
      details: proto.SyncActionValue.IContactAction,
    ) {
      return await client.addOrEditContact(this.chat, details);
    },
    pinChatorMsg: async function (pin: boolean) {
      if (this?.quoted) {
        await client.sendMessage(this.chat, {
          pin: this.quoted?.key,
          type: pin ? 1 : 2,
        });
        return pin
          ? await this.reply("```Message Pined.```")
          : await this.reply("```Message UnPined.```");
      }
      await client.chatModify({ pin }, this.chat);
      return pin
        ? await this.reply("```Chat Pined.```")
        : await this.reply("```Chat UnPined.```");
    },
    download: async function () {
      if (this?.quoted)
        return await downloadMediaMessage(this?.quoted, "buffer", {});

      return await downloadMediaMessage(this, "buffer", {});
    },
    client,
  };
};

export type SerializedMessage = Awaited<ReturnType<typeof serialize>>;
export default serialize;
