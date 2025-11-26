import type { CommandProperty } from "../";

export default {
  pattern: "p2p",
  alias: ["peer"],
  category: "p2p",
  async exec(msg, sock) {
    await sock.sendMessage(msg.chat, { text: "P2P works" });
  }
} satisfies CommandProperty;
