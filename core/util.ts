import { findCommand } from "plugins/_definition";
import type { SerializedMessage } from "seralize";

export const logForGo = (tag: string, data: any) => {
  const output = {
    tag: tag,
    timestamp: new Date().toISOString(),
    payload: data,
  };
  console.log(`[GO_DATA] ${JSON.stringify(output)}`);
};

export const handleCommand = async (msg: SerializedMessage) => {
  const text =
    msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  if (!text) return;

  const args = text?.split(" ")[1];

  const cmd = findCommand(text);
  await cmd?.function(msg, args);
};
