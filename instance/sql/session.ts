import { proto, initAuthCreds, BufferJSON } from "baileys";
import type { AuthenticationCreds, SignalDataTypeMap } from "baileys";
import { AuthTokenManager } from ".";
import { handleLidMapping } from "./contacts";

export const useHybridAuthState = async (client: any, phone: string) => {
  const keyPrefix = `session:${phone}:`;
  const saveToSQL = async (key: string, value: any) => {
    await AuthTokenManager.set({
      sessionId: phone,
      token: key,
      value: JSON.stringify(value, BufferJSON.replacer),
      createdAt: new Date(),
    });
  };

  const redisAuth = await useRedisAuthState(
    client,
    keyPrefix,
    saveToSQL,
    phone,
  );

  return {
    ...redisAuth,
    saveCreds: async () => {
      await redisAuth.saveCreds();
      await saveToSQL("creds", redisAuth.state.creds);
    },
  };
};

export const useRedisAuthState = async (
  client: any,
  keyPrefix: string,
  onWrite: (key: string, data: any) => Promise<void>,
  phone: string,
) => {
  const getRedisKey = (key?: string) => {
    const safeKey = key?.replace(/\//g, "__")?.replace(/:/g, "-");
    return `${keyPrefix}${safeKey}`;
  };

  const writeData = async (data: any, key: string) => {
    const redisKey = getRedisKey(key);
    await client.set(redisKey, JSON.stringify(data, BufferJSON.replacer));
    if (key.startsWith("app-state-sync-key")) {
      await onWrite(key, data);
    }
  };

  const readData = async (key: string) => {
    const data = await client.get(getRedisKey(key));
    if (!data) return null;
    return JSON.parse(data, BufferJSON.reviver);
  };

  const removeData = async (key: string) => {
    await client.del(getRedisKey(key));
  };

  const creds: AuthenticationCreds =
    (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        //@ts-ignore
        get: async (type, ids) => {
          //@ts-ignore
          const data: { [_: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id: string) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }),
          );
          return data;
        },
        //@ts-ignore
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category as keyof SignalDataTypeMap]) {
              const value = data[category as keyof SignalDataTypeMap]![id];
              const key = `${category}-${id}`;
              if (key.includes("lid-mapping")) {
                handleLidMapping(key, value as string, phone);
              }
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeData(creds, "creds");
    },
  };
};
