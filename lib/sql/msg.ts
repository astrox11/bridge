import { proto, type WAMessageKey } from "baileys";
import { bunql } from "./_sql";
import type { WAMessage } from "baileys/src";

const Message = bunql.define("messages", {
  id: { type: "TEXT", primary: true },
  msg: { type: "TEXT" },
});

export const getMessage = async (key: WAMessageKey) => {
  const id = key?.id;
  if (id) {
    const m = Message.find({ id }).run()[0];
    return m ? proto.Message.fromObject(JSON.parse(m.msg)) : undefined;
  }
  return undefined;
};

export const saveMessage = (key: WAMessageKey, msg: WAMessage) => {
  const id = key?.id;
  if (id) {
    Message.upsert({ id, msg: JSON.stringify(msg || {}) });
  }
};
