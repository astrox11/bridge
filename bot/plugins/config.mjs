import { Configuration } from "../sql";
import { parseId, setCookie, getCookie, deleteCookie } from "../utility";

export default [
  {
    pattern: "setprefix",
    fromMe: true,
    function: async (msg, args) => {
      const config = new Configuration(msg.session);

      if (!args) {
        await config.setPrefix(null);
        return msg.reply("```Prefix Removed```");
      }

      const isSymbol = /^[^\a-zA-Z0-9\s]+$/.test(args);

      if (!isSymbol && args !== "null") {
        return msg.reply("```Prefix must be symbols only```");
      }

      await config.setPrefix(args);
      return msg.reply(`\`\`\`Prefix set to: ${args}\`\`\``);
    },
  },
  {
    pattern: "setsudo",
    fromMe: true,
    function: async (msg, args) => {
      const config = new Configuration(msg.session);
      let targetId;

      targetId = await parseId(msg, args);

      if (!targetId) {
        return msg.reply("```Please reply to a user or provide a number```");
      }

      targetId = targetId.split("@")[0];

      await config.addSudo(targetId);
      return msg.reply(`\`\`\`Added @${targetId} to sudo list\`\`\``);
    },
  },
  {
    pattern: "delsudo",
    fromMe: true,
    function: async (msg, args) => {
      const config = new Configuration(msg.session);
      let targetId;

      targetId = await parseId(msg, args);

      if (!targetId) {
        return msg.reply("```Please reply to a user or provide a number```");
      }

      targetId = targetId.split("@")[0];

      const current = await config.getSudo();
      const newSudo = current.filter((id) => id !== targetId);

      await config.setSudo(newSudo);
      return msg.reply(`\`\`\`Removed @${targetId} from sudo list\`\`\``);
    },
  },
  {
    pattern: "getsudo",
    fromMe: true,
    function: async (msg) => {
      const config = new Configuration(msg.session);
      const sudoUsers = await config.getSudo();

      if (sudoUsers.length === 0) {
        return msg.reply("```Sudo list is empty```");
      }
      const list = sudoUsers.map((id) => `@${id}`).join("\n");
      return msg.client.sendMessage(msg.chat, {
        text: `\`\`\`Sudo Users:\n${list}\`\`\``,
        mentions: sudoUsers,
      });
    },
  },
  {
    pattern: "mode",
    fromMe: true,
    function: async (msg, args) => {
      const config = new Configuration(msg.session);

      if (!args) {
        const current = await config.getMode();
        return msg.reply(`\`\`\`Current mode: ${current}\`\`\``);
      }

      const newMode = args.toLowerCase();
      if (newMode !== "public" && newMode !== "private") {
        return msg.reply("```Mode must be 'public' or 'private'```");
      }

      await config.setMode(newMode);
      return msg.reply(`\`\`\`Mode set to: ${newMode}\`\`\``);
    },
  },
  {
    pattern: "cookie",
    fromMe: true,
    function: async (msg, args) => {
      if (!args) {
        return msg.reply(
          "```Usage:\ncookie <platform> <value> - Set cookie\ncookie <platform> - Get cookie\ncookie <platform> delete - Delete cookie\n\nSupported platforms: youtube```",
        );
      }

      const parts = args.split(" ");
      const platform = parts[0].toLowerCase();
      const value = parts.slice(1).join(" ");

      const supportedPlatforms = ["youtube"];
      if (!supportedPlatforms.includes(platform)) {
        return msg.reply(
          `\`\`\`Unsupported platform: ${platform}\nSupported: ${supportedPlatforms.join(", ")}\`\`\``,
        );
      }

      if (value.toLowerCase() === "delete") {
        await deleteCookie(msg.session, platform);
        return msg.reply(`\`\`\`Cookie deleted for ${platform}\`\`\``);
      }

      if (!value) {
        const cookie = await getCookie(msg.session, platform);
        if (!cookie) {
          return msg.reply(`\`\`\`No cookie set for ${platform}\`\`\``);
        }
        const preview =
          cookie.length > 50 ? cookie.substring(0, 50) + "..." : cookie;
        return msg.reply(`\`\`\`Cookie for ${platform}:\n${preview}\`\`\``);
      }

      await setCookie(msg.session, platform, value);
      return msg.reply(`\`\`\`Cookie set for ${platform}\`\`\``);
    },
  },
];
