import { bunql } from "./_sql";

const Prefix = bunql.define("prefix", {
  session_id: { type: "TEXT" },
  prefix: { type: "TEXT" },
});

export const set_prefix = (session_id: string, prefix?: string) => {
  Prefix.delete().where({ session_id });

  return Prefix.insert({
    session_id,
    prefix,
  });
};

export const get_prefix = (session_id: string) => {
  const row = Prefix.select().where({ session_id }).first();

  return row ? row.prefix?.split("") : null;
};

export const del_prefix = (session_id: string) => {
  return Prefix.delete().where({ session_id }).run();
};
