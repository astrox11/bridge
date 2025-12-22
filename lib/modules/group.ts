import { Group, type CommandProperty } from "../.";

export default [
  {
    pattern: "add",
    category: "groups",
    isGroup: true,
    isAdmin: true,
    async exec(msg, sock, args) {
      if (!args) return await msg.reply("ᴘʀᴏᴠɪᴅᴇ ɴᴜᴍʙᴇʀ");
      const number = args.includes("@s.whatsapp.net")
        ? args
        : args + "@s.whatsapp.net";
      await new Group(msg.chat, sock).Add(number);
      await msg.reply("ᴅᴏɴᴇ");
    },
  },
  {
    pattern: "kick",
    alias: ["remove"],
    category: "groups",
    isGroup: true,
    isAdmin: true,
    async exec(msg, sock, args) {
      args = msg?.quoted ? msg.quoted.sender : args;
      if (!args) return await msg.reply("ᴘʀᴏᴠɪᴅᴇ ɴᴜᴍʙᴇʀ");
      const number = args.includes("@s.whatsapp.net")
        ? args
        : args + "@s.whatsapp.net";
      await new Group(msg.chat, sock).Remove(number);
      await msg.reply("ᴅᴏɴᴇ");
    },
  },
  {
    pattern: "kickall",
    category: "groups",
    isGroup: true,
    isAdmin: true,
    async exec(msg, sock) {
      await new Group(msg.chat, sock).KickAll();
      await msg.reply("ᴅᴏɴᴇ");
    },
  },
  {
    pattern: "gname",
    category: "groups",
    isGroup: true,
    isAdmin: true,
    async exec(msg, sock, args) {
      if (!args) return await msg.reply("ᴘʀᴏᴠɪᴅᴇ ɴᴇᴡ ɴᴀᴍᴇ");
      await new Group(msg.chat, sock).Name(args);
      await msg.reply("ᴅᴏɴᴇ");
    },
  },
] satisfies Array<CommandProperty>;
