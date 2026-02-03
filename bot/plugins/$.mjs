import { inspect } from "bun";

export default {
  event: true,
  function: async (msg) => {
    if (!msg.text?.startsWith("$")) return;

    const code = msg.text.slice(1).trim();
    if (!code) return await msg.reply("No code provided");

    try {
      const AsyncFunction = Object.getPrototypeOf(
        async function () {},
      ).constructor;

      const execute = new AsyncFunction(
        "msg",
        "Bun",
        "inspect",
        code.includes("return") ? code : `return ${code}`,
      );

      const result = await execute(msg, Bun, inspect);

      const output =
        typeof result === "string" ? result : inspect(result, { depth: 2 });

      await msg.reply(`\`\`\`\n${output}\n\`\`\``);
    } catch (error) {
      const e =
        error instanceof Error ? error.stack || error.message : String(error);
      await msg.reply(`\`\`\`Error:\n${e}\n\`\`\``);
    }
  },
};
