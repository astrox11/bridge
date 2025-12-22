import type { GroupMetadata, WASocket } from "baileys";
import { bunql } from "./_sql";
import { log } from "../util";

const Group = bunql.define("groups", {
  id: { type: "TEXT", primary: true },
  data: { type: "TEXT" },
});

export const cachedGroupMetadata = async (id: string) => {
  const metadata = Group.select().where("id", "=", id).get() as unknown as
    | GroupMetadata
    | undefined;
  return metadata ? metadata : undefined;
};

export const GetGroupMeta = (id: string) => {
  const metadata = Group.select().where("id", "=", id).get() as unknown as
    | GroupMetadata
    | undefined;
  return metadata ? metadata : undefined;
};

export const cacheGroupMetadata = async (
  metadata: GroupMetadata | (Partial<GroupMetadata> & { id: string }),
) => {
  const exists = Group.select().where("id", "=", metadata.id).get()[0];

  if (exists) {
    const existingData = JSON.parse(exists.data) as GroupMetadata;

    const mergedData: GroupMetadata = {
      ...existingData,
      ...metadata,
      participants:
        metadata.participants !== undefined
          ? metadata.participants
          : existingData.participants,
    };

    return Group.update({ data: JSON.stringify(mergedData) })
      .where("id", "=", metadata.id)
      .run();
  } else {
    return Group.insert({
      id: metadata.id,
      data: JSON.stringify(metadata),
    });
  }
};

export const removeGroupMetadata = async (id: string) => {
  return Group.delete().where("id", "=", id).run();
};

export const isAdmin = function (chat: string, participantId: string) {
  const metadata = Group.select().where("id", "=", chat).get() as unknown as
    | GroupMetadata
    | undefined;
  if (!metadata) return false;
  const participant = metadata.participants.find((p) => p.id === participantId);
  if (!participant) return false;
  return participant.admin !== null;
};

export const isSuperAdmin = function (chat: string, participantId: string) {
  const metadata = Group.select().where("id", "=", chat).get() as unknown as
    | GroupMetadata
    | undefined;
  if (!metadata) return false;
  const participant = metadata.participants.find((p) => p.id === participantId);
  if (!participant) return false;
  return participant.admin === "superadmin";
};

export const getGroupAdmins = function (chat: string) {
  const metadata = Group.select().where("id", "=", chat).get() as unknown as
    | GroupMetadata
    | undefined;
  if (!metadata) return [];
  const admins = metadata.participants
    .filter((p) => p.admin !== null)
    .map((p) => p.id);
  return admins;
};

export const syncGroupMetadata = async (client: WASocket) => {
  try {
    const groups = await client.groupFetchAllParticipating();
    for (const [id, metadata] of Object.entries(groups)) {
      metadata.id = id;
      await cacheGroupMetadata(metadata);
    }
  } catch (error) {
    log.error("Error syncing group metadata:", error);
  }
  return;
};
