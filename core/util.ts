import { readFileSync } from "fs";
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

export const parseEnv = (buffer: Buffer) => {
  const lines = buffer.toString().split(/\r?\n/);
  const result: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key, ...values] = trimmed.split("=");
    const value = values.join("=").trim();

    if (key) {
      result[key.trim()] = value.replace(/^['"]|['"]$/g, "");
    }
  }

  return result;
};

export const updateSetting = async (
  phone: string,
  key: string,
  value: string | number
) => {
  const env = readFileSync("../.env");
  try {
    const response = await fetch(
      `http://127.0.0.1:${
        parseEnv(env)["PORT"] || "8080"
      }/api/settings/${phone}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key, value }),
      }
    );

    await response.json();

    if (response.ok) {
      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.error(e);
  }
};
