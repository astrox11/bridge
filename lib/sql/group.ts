import type { GroupMetadata } from "baileys";
import { bunql } from "./_sql";

const Group = bunql.define("group", {
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

export const cacheGroupMetadata = async (metadata: GroupMetadata) => {
  const exists = Group.select().where("id", "=", metadata.id).get();
  if (exists) {
    return Group.update({ data: JSON.stringify(metadata) })
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

export const isAdmin = function (id: string, participantId: string) {
  const metadata = Group.select().where("id", "=", id).get() as unknown as
    | GroupMetadata
    | undefined;
  if (!metadata) return false;
  const participant = metadata.participants.find((p) => p.id === participantId);
  if (!participant) return false;
  return participant.admin !== null;
};
