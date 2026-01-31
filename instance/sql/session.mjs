import { proto, initAuthCreds, BufferJSON } from "baileys";
import { AuthTokenManager } from "./index.mjs";
import { handleLidMapping } from "./contacts.mjs";

export const useHybridAuthState = async (sock, phone) => {
  const keyPrefix = `session:${phone}:`;

  const saveToSQL = async (key, value) => {
    await AuthTokenManager.set({
      sessionId: phone,
      token: key,
      value: JSON.stringify(value, BufferJSON.replacer),
      createdAt: new Date(),
    });
  };

  const redisAuth = await useRedisAuthState(
    sock,
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
  sock,
  keyPrefix,
  onWrite,
  phone,
) => {
  const getRedisKey = (key) => {
    const safeKey = key?.replace(/\//g, "__")?.replace(/:/g, "-");
    return `${keyPrefix}${safeKey}`;
  };

  const writeData = async (data, key) => {
    const redisKey = getRedisKey(key);
    await sock.set(redisKey, JSON.stringify(data, BufferJSON.replacer));
    if (key.startsWith("app-state-sync-key")) {
      await onWrite(key, data);
    }
  };

  const readData = async (key) => {
    const data = await sock.get(getRedisKey(key));
    if (!data) return null;
    return JSON.parse(data, BufferJSON.reviver);
  };

  const removeData = async (key) => {
    await sock.del(getRedisKey(key));
  };

  const creds =
    (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }),
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category]?.[id];
              const key = `${category}-${id}`;
              if (key.includes("lid-mapping")) {
                handleLidMapping(key, value, phone);
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
