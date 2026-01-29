import type { Command } from ".";

export default {
  pattern: "uptime",
  alias: ["runtime"],
  category: "system",
  function: async (message) => {
    return await message.send(parse_uptime());
  },
} satisfies Command;

function parse_uptime() {
  let totalSeconds = Math.floor(process.uptime());

  const units = [
    { label: "d", seconds: 86400 },
    { label: "h", seconds: 3600 },
    { label: "m", seconds: 60 },
    { label: "s", seconds: 1 },
  ];

  const parts = [];

  for (const unit of units) {
    const value = Math.floor(totalSeconds / unit.seconds);
    if (value > 0) {
      parts.push(`${value}${unit.label}`);
      totalSeconds %= unit.seconds;
    }
  }

  return parts.join(" ") || "0s";
}
