import { GroupManager } from "./index.mjs";
import { syncGroupParticipantsToContactList } from "./contacts.mjs";

export async function cachedGroupMetadata(session, jid) {
  const res = await GroupManager.get(session);

  if (res != null) {
    for (const group of res) {
      const metadata = JSON.parse(group.groupInfo || "{}");
      if (metadata.id === jid) {
        return metadata;
      }
    }
  }
}

export const cacheGroupMetadata = async (session, metadata) => {
  await GroupManager.set({
    sessionId: session,
    groupId: metadata.id,
    groupInfo: JSON.stringify(metadata),
    updatedAt: new Date(),
    createdAt: new Date(),
  });
};

export const isAdmin = async (session, chat, participantId) => {
  const metadata = await cachedGroupMetadata(session, chat);
  if (!metadata) return false;
  return metadata.participants.some(
    (participant) =>
      participant.id === participantId && participant.admin !== null,
  );
};

export const syncGroupMetadata = async (phone, sock) => {
  try {
    const groups = await sock.groupFetchAllParticipating();
    for (const metadata of Object.values(groups)) {
      await cacheGroupMetadata(phone, metadata);
      await syncGroupParticipantsToContactList(phone, metadata);
    }
  } catch (e) {
    console.error("Failed to sync groups and participants", e);
  }
};
