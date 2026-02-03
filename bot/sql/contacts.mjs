import { isPnUser } from "baileys";
import { ContactManager } from "./index.mjs";

export const saveContact = async (pn, lid, session) => {
  if (!isPnUser(pn)) return;
  await ContactManager.set({
    sessionId: session,
    contactPn: pn,
    contactLid: lid,
    addedAtnew: Date(),
    createdAtnew: Date(),
  });
};

export function handleLidMapping(key, value, sessionPhone) {
  const isPn = !key.includes("reverse");
  const cleanedValue = value.replace(/^"|"$/g, "");
  if (isPn) {
    const pnKey = key.split("-")[2];
    if (pnKey)
      saveContact(
        `${pnKey}@s.whatsapp.net`,
        `${cleanedValue}@lid`,
        sessionPhone,
      );
  } else {
    const keyPart = key.split("-")[2];
    const lidKey = keyPart?.split("_")[0];
    if (lidKey)
      saveContact(
        `${cleanedValue}@lid`,
        `${lidKey}@s.whatsapp.net`,
        sessionPhone,
      );
  }
}

export const syncGroupParticipantsToContactList = async (
  sessionPhone,
  metadata,
) => {
  const tasks = [];

  for (const participant of metadata.participants) {
    tasks.push(
      saveContact(participant.phoneNumber, participant.id, sessionPhone),
    );
  }

  await Promise.all(tasks);
};

export async function getAlternateId(session, id) {
  id = id?.replace(/\D/g, "");

  const jid = `${id}@s.whatsapp.net`;
  const lid = `${id}@lid`;

  const contactByPn = await ContactManager.get(session);

  if (contactByPn != null) {
    for (const contact of contactByPn) {
      const info = contact.contactPn ? contact.contactPn : null;
      if (info && info === jid) return contact.contactLid;
    }
  }

  const contactByLid = await ContactManager.get(session);

  if (contactByLid != null) {
    for (const contact of contactByLid) {
      const info = contact.contactLid ? contact.contactLid : null;
      if (info && info === lid) return contact.contactPn;
    }
  }
}
