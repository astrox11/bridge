import { bunql } from "./_sql";

const Ban = bunql.define("ban", {
  pn: { type: "TEXT", primary: true },
  lid: { type: "TEXT" },
});

export const isBan = (id: string) => {
  const users = Ban.select().where("pn", "=", id).orWhere("lid", "=", id).get();
  return [...users.map((u) => u.pn), ...users.map((u) => u.lid)].includes(id);
};

export const addBan = (pn: string, lid: string) => {
  const existing = Ban.select().where("pn", "=", pn).get();
  if (existing.length > 0) {
    return existing[0];
  }
  return Ban.insert({ pn, lid });
};

export const removeBan = (id: string) => {
  return Ban.delete().where("pn", "=", id).orWhere("lid", "=", id).run();
};
