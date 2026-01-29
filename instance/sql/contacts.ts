import { isPnUser } from "baileys";
import type { GroupMetadata } from "baileys";
import { ContactManager } from ".";

export const saveContact = async (pn: string, lid: string, session: string) => {
  if (!isPnUser(pn)) return;
  await ContactManager.set({
    sessionId: session,
    contactPn: pn,
    contactLid: lid,
    addedAt: new Date(),
    createdAt: new Date(),
  });
};

export function handleLidMapping(
  key: string,
  value: string,
  sessionPhone: string,
) {
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
  sessionPhone: string,
  metadata: GroupMetadata,
) => {
  const tasks: Promise<void>[] = [];

  for (const participant of metadata.participants) {
    tasks.push(
      saveContact(participant.phoneNumber!, participant.id!, sessionPhone),
    );
  }

  await Promise.all(tasks);
};

export async function getAlternateId(session: string, id: string) {
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
