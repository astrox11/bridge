import { bunql } from "./_sql";

const Contact = bunql.define("contact", {
  pn: { type: "TEXT", primary: true },
  lid: { type: "TEXT" },
});

export const addContact = (pn: string, lid: string) => {
  return Contact.upsert({ pn, lid });
};

export const getLidByPn = async (pn: string) => {
  const contact = Contact.find({ pn })[0];
  return contact?.lid || null;
};

export const getPnByLid = (lid: string) => {
  const contact = Contact.query().where("lid", "=", lid).first();
  return contact?.pn || null;
};

export const removeContact = (id: string) => {
  return Contact.delete().where("pn", "=", id).orWhere("lid", "=", id).run();
};
