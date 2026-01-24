import { inspect } from "bun";
import type { Command } from ".";

export default {
  event: true,
  function: async (msg) => {
    if (!msg.text?.startsWith("$")) return;

    const code = msg.text.slice(1).trim();
    if (!code) return await msg.reply("No code provided");

    try {
      const base64Code = Buffer.from(
        `
        export const run = async () => {
          ${code.includes("return") ? code : `return ${code}`}
        };
      `,
      ).toString("base64");

      const module = await import(`data:text/javascript;base64,${base64Code}`);
      const result = await module.run();

      const output =
        typeof result === "string" ? result : inspect(result, { depth: 2 });
      await msg.reply(`\`\`\`\n${output}\n\`\`\``);
    } catch (error) {
      const e = error instanceof Error ? error.message : String(error);
      await msg.reply(`\`\`\`Error:\n${e}\n\`\`\``);
    }
  },
} satisfies Command;
