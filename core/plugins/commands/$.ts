import { inspect } from "bun";
import type { Command } from "plugins/_definition";

export default {
  event: true,
  function: async (msg) => {
    if (!msg.text?.startsWith("$")) return;

    const code = msg.text.slice(1).trim();

    if (!code) return await msg.reply("No code provided");

    try {
      const asyncEval = async () => {
        return eval(`(async () => { ${code} })()`);
      };

      const result = await asyncEval();

      const output =
        typeof result === "string" ? result : inspect(result, { depth: 2 });

      await msg.reply(`\`\`\`\n${output}\n\`\`\``);
    } catch (error) {
      const e = error instanceof Error ? error.message : String(error);

      await msg.reply(`\`\`\`Error:\n${e}\n\`\`\``);
    }
  },
} satisfies Command;
