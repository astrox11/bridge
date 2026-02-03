import { downloadMediaMessage, jidNormalizedUser } from "baileys";
import { isAdmin as admin, getAlternateId } from "../sql";
import { serialize_full, parse_content } from "../pkg/util";

const serialize = async (msg, client) => {
  const core = serialize_full(msg);

  const [senderAlt, isAdmin] = await Promise.all([
    getAlternateId(msg.session, core.sender),
    core.isGroup ? admin(msg.session, core.chat, core.sender) : null,
  ]);

  if (core.quoted) {
    core.quoted.key.fromMe = [
      core.quoted.sender,
      await getAlternateId(msg.session, core.quoted.sender),
    ].includes(jidNormalizedUser(client.user.id));
  }

  const isMedia = (mtype) =>
    [
      "imageMessage",
      "videoMessage",
      "audioMessage",
      "documentMessage",
      "stickerMessage",
    ].includes(mtype);

  return {
    ...core,
    key: msg.key,
    message: msg.message,
    session: msg.session,
    senderAlt,
    isAdmin,
    pushName: msg.pushName,
    messageTimestamp: msg.messageTimestamp,
    media: isMedia(core.mtype),

    reply: async function (text) {
      return await client.sendMessage(this.chat, { text }, { quoted: msg });
    },

    send: async function (input, opts = {}) {
      const content = await parse_content(input);

      if (!content) {
        return await this.reply("```Error: Failed to parse content```");
      }

      const sendMap = {
        "text/plain": { text: content.content, ...opts },
        "image/": { image: content.buffer, ...opts },
        "video/": { video: content.buffer, ...opts },
        "audio/": { audio: content.buffer, ...opts },
      };

      for (const [mime, body] of Object.entries(sendMap)) {
        if (content.mimetype?.startsWith(mime)) {
          const m = await client.sendMessage(this.chat, body, opts);
          return await serialize({ ...m, session: this.session }, client);
        }
      }

      return await this.reply("```Error: Unsupported media type```");
    },

    edit: async function (text) {
      const editContent =
        this.mtype === "imageMessage"
          ? { image: { url: "" }, text }
          : this.mtype === "videoMessage"
            ? { video: { url: "" }, text }
            : { text };
      return await client.sendMessage(this.chat, {
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
          this.chat,
        );
      }
      return await client.sendMessage(this.chat, { delete: targetKey });
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
    archiveChat: async function (archive) {
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
    starMessage: async function (star) {
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
    recordContact: async function (details) {
      return await client.addOrEditContact(this.chat, details);
    },
    pinChatorMsg: async function (pin) {
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
    react: async function (emoji) {
      return await client.sendMessage(this.chat, {
        react: {
          text: emoji,
          key: this.key,
        },
      });
    },
    forward: async function (jid) {
      return await client.sendMessage(jid, {
        forward: this?.quoted || this,
        contextInfo: { isForwarded: false, forwardingscore: 0 },
      });
    },
    client,
  };
};

export default serialize;
