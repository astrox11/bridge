import { Command } from ".";

export default [
  {
    pattern: "pin",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.pinChatorMsg(true);
    },
  },
  {
    pattern: "unpin",
    fromMe: true,
    category: "p2p",
    function: async (msg) => {
      await msg.pinChatorMsg(false);
    },
  },
] satisfies Command[];
