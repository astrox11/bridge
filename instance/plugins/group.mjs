import { isAdmin } from "../sql";
import { parseId } from "../utility";
import { WA_DEFAULT_EPHEMERAL } from "baileys";

export default [
  {
    pattern: "approval",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg, args) => {
      const mode = args?.toLowerCase().trim();
      if (mode === "on") {
        await msg.client.groupSettingUpdate(
          msg.chat,
          "membership_approval_mode",
        );
        return await msg.send("```Member approval mode enabled.```");
      }
      if (mode === "off") {
        await msg.client.groupSettingUpdate(
          msg.chat,
          "not_membership_approval_mode",
        );
        return await msg.send("```Member approval mode disabled.```");
      }
      return await msg.send("```Usage: approval on/off```");
    },
  },
  {
    pattern: "demote",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg, args) => {
      const user = await parseId(msg, args);
      if (!user) return msg.send("```Provide user to demote```");
      const isAlreadyAdmin = await isAdmin(msg.session, msg.chat, user);
      if (!isAlreadyAdmin) return msg.send("```User wasn't an admin```");
      await msg.client.groupParticipantsUpdate(msg.chat, [user], "demote");
      return await msg.client.sendMessage(msg.chat, {
        text: `\`\`\`@${user.split("@")[0]} is no longer an admin\`\`\``,
        mentions: [user],
      });
    },
  },
  {
    pattern: "ephemeral",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg, args) => {
      const mode = args?.toLowerCase().trim();
      if (mode === "on") {
        await msg.client.sendMessage(msg.chat, {
          disappearingMessagesInChat: WA_DEFAULT_EPHEMERAL,
        });
        return await msg.send(
          "```Disappearing messages enabled (24 hours).```",
        );
      }
      if (mode === "off") {
        await msg.client.sendMessage(msg.chat, {
          disappearingMessagesInChat: false,
        });
        return await msg.send("```Disappearing messages disabled.```");
      }
      return await msg.send("```Usage: ephemeral on/off```");
    },
  },
  {
    pattern: "gdesc",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg, args) => {
      if (!args) return msg.send("```Provide a new description```");
      await msg.client.groupUpdateDescription(msg.chat, args);
      return await msg.send("```Group description updated successfully.```");
    },
  },
  {
    pattern: "ginfo",
    alias: ["groupinfo"],
    category: "group",
    isGroup: true,
    function: async (msg) => {
      const metadata = await msg.client.groupMetadata(msg.chat);
      const creationDate = new Date(metadata.creation * 1000).toLocaleString();
      const info = `*Group Name:* ${metadata.subject}\n*Group ID:* ${metadata.id}\n*Owner:* ${metadata.owner ? "@" + metadata.owner.split("@")[0] : "System"}\n*Created On:* ${creationDate}\n*Participants:* ${metadata.participants.length}\n*Description:* ${metadata.desc || "No description"}`;
      return await msg.client.sendMessage(msg.chat, {
        text: info,
        mentions: metadata.owner ? [metadata.owner] : [],
      });
    },
  },
  {
    pattern: "gname",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg, args) => {
      if (!args) return msg.send("```Provide a new name for the group```");
      await msg.client.groupUpdateSubject(msg.chat, args);
      return await msg.send(`\`\`\`Group name updated to: ${args}\`\`\``);
    },
  },
  {
    pattern: "invite",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      const code = await msg.client.groupInviteCode(msg.chat);
      return await msg.send(`https://chat.whatsapp.com/${code}`);
    },
  },
  {
    pattern: "kick",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg, args) => {
      const user = await parseId(msg, args);
      if (!user)
        return msg.send("```Provide a user to kick (reply or mention)```");
      await msg.client.groupParticipantsUpdate(msg.chat, [user], "remove");
      return await msg.client.sendMessage(msg.chat, {
        text: `\`\`\`@${user.split("@")[0]} has been removed from the group.\`\`\``,
        mentions: [user],
      });
    },
  },
  {
    pattern: "leave",
    alias: ["left"],
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      await msg.send("```Goodbye! Leaving the group...```");
      return await msg.client.groupLeave(msg.chat);
    },
  },
  {
    pattern: "lock",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      await msg.client.groupSettingUpdate(msg.chat, "locked");
      return await msg.send(
        "```Group settings locked. Only admins can edit group info.```",
      );
    },
  },
  {
    pattern: "unlock",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      await msg.client.groupSettingUpdate(msg.chat, "unlocked");
      return await msg.send(
        "```Group settings unlocked. All members can edit group info.```",
      );
    },
  },
  {
    pattern: "mute",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      await msg.client.groupSettingUpdate(msg.chat, "announcement");
      return await msg.send(
        "```Group muted. Only admins can send messages.```",
      );
    },
  },
  {
    pattern: "unmute",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      await msg.client.groupSettingUpdate(msg.chat, "not_announcement");
      return await msg.send(
        "```Group unmuted. All participants can send messages.```",
      );
    },
  },
  {
    pattern: "promote",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg, args) => {
      const user = await parseId(msg, args);
      if (!user) return msg.send("```Provide user to promote```");
      const isAlreadyAdmin = await isAdmin(msg.session, msg.chat, user);
      if (isAlreadyAdmin) return msg.send("```User is already an admin```");
      await msg.client.groupParticipantsUpdate(msg.chat, [user], "promote");
      return await msg.client.sendMessage(msg.chat, {
        text: `\`\`\`@${user.split("@")[0]} is now an admin\`\`\``,
        mentions: [user],
      });
    },
  },
  {
    pattern: "requests",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      const requests = await msg.client.groupRequestParticipantsList(msg.chat);
      if (!requests || requests.length === 0)
        return await msg.send("```No pending join requests.```");
      let response = "*Pending Join Requests:*\n\n";
      requests.forEach((req, index) => {
        response += `${index + 1}. @${req.jid.split("@")[0]}\n`;
      });
      return await msg.client.sendMessage(msg.chat, {
        text: response,
        mentions: requests.map((r) => r.jid),
      });
    },
  },
  {
    pattern: "revoke",
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      await msg.client.groupRevokeInvite(msg.chat);
      return await msg.send(
        "```Group invite link has been revoked and reset.```",
      );
    },
  },
  {
    pattern: "gpp",
    alias: ["setgpp"],
    category: "group",
    isGroup: true,
    isAdmin: true,
    function: async (msg) => {
      const quoted = msg.quoted;
      if (!quoted || !quoted?.image)
        return await msg.send(
          "```Reply to an image to set it as the group profile picture.```",
        );
      const stream = await msg.download(quoted);
      await msg.client.updateProfilePicture(msg.chat, stream);
      return await msg.send(
        "```Group profile picture updated successfully.```",
      );
    },
  },
];
