import type { CommandProperty } from "..";
import { saveSticker } from "../sql";

export default {
  pattern: "bgm",
  category: "media",
  async exec(msg) {
    if (!msg?.quoted?.audio) {
      return await msg.reply("```Reply to an audio message```");
    }

    try {
      // Download the quoted audio
      const audioBuffer = await msg.quoted.download();
      
      // Generate a hash (sha256) from the audio buffer
      const crypto = await import("crypto");
      const hash = crypto.createHash("sha256");
      hash.update(audioBuffer);
      const sha256 = hash.digest("hex");

      // Save to database with a default name or you could allow custom name
      saveSticker(msg.sessionId, "bgm_audio", sha256);

      await msg.reply("```BGM saved successfully```");
    } catch (error) {
      const e = error instanceof Error ? error.message : String(error);
      await msg.reply(`\`\`\`Error: ${e}\n\`\`\``);
    }
  },
} satisfies CommandProperty;
