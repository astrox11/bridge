import type { GroupParticipant } from "baileys";
import { bunql } from "./_sql";

const Contact = bunql.define("contacts", {
  session_id: { type: "TEXT", notNull: true },
  pn: { type: "TEXT", notNull: true },
  lid: { type: "TEXT" },
});

// Create composite index for efficient lookups
try {
  bunql.exec(
    "CREATE INDEX IF NOT EXISTS idx_contacts_session ON contacts(session_id, pn)",
  );
} catch {
  // Index may already exist
}

export const addContact = (sessionId: string, pn: string, lid: string) => {
  if (pn && lid) {
    pn = pn?.split("@")[0];
    lid = lid?.split("@")[0];
    const exists = Contact.query()
      .where("session_id", "=", sessionId)
      .where("pn", "=", pn)
      .first();
    if (exists) {
      Contact.update({ lid })
        .where("session_id", "=", sessionId)
        .where("pn", "=", pn)
        .run();
    } else {
      Contact.insert({ session_id: sessionId, pn, lid });
    }
  }
  return;
};

export const getAllContacts = (sessionId: string) => {
  return Contact.query()
    .where("session_id", "=", sessionId)
    .get()
    .map((p) => p.pn)
    .map((e) => `${e}@s.whatsapp.net`);
};

export const getLidByPn = async (sessionId: string, pn: string) => {
  const contact = Contact.query()
    .where("session_id", "=", sessionId)
    .where("pn", "=", pn)
    .first();
  return contact?.lid + "@lid" || null;
};

export const getPnByLid = (sessionId: string, lid: string) => {
  const contact = Contact.query()
    .where("session_id", "=", sessionId)
    .where("lid", "=", lid)
    .first();
  return contact?.pn + "@s.whatsapp.net" || null;
};

export const getBothId = (sessionId: string, id: string) => {
  const cleanId = (id.includes(":") ? id.split(":")[1] : id).split("@")[0];

  const contact = Contact.query()
    .where("session_id", "=", sessionId)
    .where("pn", "=", cleanId)
    .orWhere("lid", "=", cleanId)
    .first();

  if (!contact) return null;

  return {
    pn: contact.pn + "@s.whatsapp.net",
    lid: contact.lid + "@lid",
  };
};

export const getAlternateId = (sessionId: string, id: string) => {
  id = id?.split("@")?.[0];
  const contact = Contact.query()
    .where("session_id", "=", sessionId)
    .where("pn", "=", id)
    .orWhere("lid", "=", id)
    .first();
  if (!contact) return null;
  return contact.pn === id
    ? contact.lid + "@lid"
    : contact.pn + "@s.whatsapp.net";
};

export const removeContact = (sessionId: string, id: string) => {
  return Contact.delete()
    .where("session_id", "=", sessionId)
    .where("pn", "=", id)
    .orWhere("lid", "=", id)
    .run();
};

export const syncGroupParticipantsToContactList = (
  sessionId: string,
  participants: GroupParticipant[],
) => {
  if (!participants) return;
  for (const participant of participants) {
    addContact(sessionId, participant.phoneNumber, participant.id);
  }
};

export function parseId(sessionId: string, input: string): string | null;
export function parseId(sessionId: string, input: string[]): string[];
export function parseId(
  sessionId: string,
  input: string | string[],
): string | string[] | null {
  if (Array.isArray(input)) {
    return input
      .map((v) => parseId(sessionId, v))
      .filter((v): v is string => typeof v === "string");
  }

  if (!input) return null;

  const clean = input.includes(":") ? input.split(":")[1] : input;
  const [rawBase, suffix] = clean.split("@");
  const base = rawBase.replace(/^@+/, "");

  if (suffix === "s.whatsapp.net") return `${base}@s.whatsapp.net`;
  if (suffix === "lid") return `${base}@lid`;

  const resolve = (pn?: string, lid?: string) => {
    if (pn === base || pn?.startsWith(base)) return `${pn}@s.whatsapp.net`;
    if (lid === base || lid?.startsWith(base)) return `${lid}@lid`;
    return null;
  };

  const contact = Contact.query()
    .where("session_id", "=", sessionId)
    .where("pn", "=", base)
    .orWhere("lid", "=", base)
    .first();

  if (contact) {
    const resolved = resolve(contact.pn, contact.lid);
    if (resolved) return resolved;
  }

  const fuzzy = Contact.query()
    .where("session_id", "=", sessionId)
    .where("pn", "LIKE", `${base}%`)
    .orWhere("lid", "LIKE", `${base}%`)
    .limit(1)
    .get()[0];

  if (fuzzy) {
    const resolved = resolve(fuzzy.pn, fuzzy.lid);
    if (resolved) return resolved;
  }

  return null;
}
