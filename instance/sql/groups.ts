import type { GroupMetadata, WASocket } from "baileys";
import { GroupManager } from ".";
import { syncGroupParticipantsToContactList } from "./contacts";

export async function cachedGroupMetadata(session: string, jid: string) {
  const res = await GroupManager.get(session);

  if (res != null) {
    for (const group of res) {
      const metadata: GroupMetadata = JSON.parse(group.groupInfo);
      if (metadata.id === jid) {
        return metadata;
      }
    }
  }
}

export const cacheGroupMetadata = async (
  session: string,
  metadata: GroupMetadata,
) => {
  await GroupManager.set({
    sessionId: session,
    groupId: metadata.id,
    groupInfo: JSON.stringify(metadata),
    updatedAt: new Date(),
    createdAt: new Date(),
  });
};

export const isAdmin = async (
  session: string,
  chat: string,
  participantId: string,
) => {
  const metadata = await cachedGroupMetadata(session, chat);
  if (!metadata) return false;
  return metadata.participants.some(
    (participant) =>
      participant.id === participantId && participant.admin !== null,
  );
};

export const syncGroupMetadata = async (phone: string, sock: WASocket) => {
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
