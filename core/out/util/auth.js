import { Database } from "bun:sqlite";
import { SQL } from "bun";
import { proto, initAuthCreds, BufferJSON, isPnUser } from "baileys";
const isProd = process.env.NODE_ENV === "production";
export const getDb = () => {
    if (isProd) {
        return new SQL(process.env.DATABASE_URL);
    }
    else {
        const sqlite = new Database("../dev.sqlite");
        sqlite.run("PRAGMA journal_mode = WAL;");
        sqlite.run("PRAGMA synchronous = NORMAL;");
        sqlite.run(`CREATE TABLE IF NOT EXISTS sessions (phone TEXT PRIMARY KEY, status TEXT, updated_at TEXT);`);
        sqlite.run(`CREATE TABLE IF NOT EXISTS auth_data (id TEXT PRIMARY KEY, data TEXT, updated_at TEXT);`);
        sqlite.run(`
      CREATE TABLE IF NOT EXISTS user_messages (
        id TEXT, 
        session_phone TEXT, 
        data TEXT, 
        timestamp TEXT, 
        PRIMARY KEY (id, session_phone)
      );
    `);
        sqlite.run(`
      CREATE TABLE IF NOT EXISTS user_contacts (
        pn TEXT, 
        session_phone TEXT, 
        lid TEXT, 
        PRIMARY KEY (pn, session_phone)
      );
    `);
        sqlite.run(`CREATE INDEX IF NOT EXISTS idx_user_contacts_lid ON user_contacts (lid);`);
        sqlite.run(`CREATE INDEX IF NOT EXISTS idx_user_messages_timestamp ON user_messages (timestamp);`);
        sqlite.run(`
      CREATE TABLE IF NOT EXISTS group_metadata (
        id TEXT, 
        session_phone TEXT, 
        metadata TEXT, 
        updated_at TEXT, 
        PRIMARY KEY (id, session_phone)
      );
    `);
        return sqlite;
    }
};
const db = getDb();
export const useHybridAuthState = async (client, phone) => {
    const keyPrefix = `session:${phone}:`;
    const saveToSQL = async (key, value) => {
        if (!value)
            return;
        const data = JSON.stringify(value, BufferJSON.replacer);
        const now = new Date().toISOString();
        const id = `${keyPrefix}${key}`;
        if (isProd) {
            await db `
        INSERT INTO auth_data (id, data, updated_at) 
        VALUES (${id}, ${data}, ${now})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
      `;
        }
        else {
            db.run("INSERT OR REPLACE INTO auth_data (id, data, updated_at) VALUES (?, ?, ?)", [id, data, now]);
        }
    };
    const redisAuth = await useRedisAuthState(client, keyPrefix, saveToSQL, phone);
    return {
        ...redisAuth,
        saveCreds: async () => {
            await redisAuth.saveCreds();
            const now = new Date().toISOString();
            if (isProd) {
                await db `INSERT INTO sessions (phone, status, updated_at) VALUES (${phone}, 'connected', ${now}) ON CONFLICT (phone) DO UPDATE SET updated_at = EXCLUDED.updated_at`;
            }
            else {
                db.run("INSERT OR REPLACE INTO sessions (phone, status, updated_at) VALUES (?, ?, ?)", [phone, "connected", now]);
            }
            await saveToSQL("creds", redisAuth.state.creds);
        },
    };
};
export const useRedisAuthState = async (client, keyPrefix, onWrite, phone) => {
    const getRedisKey = (key) => {
        const safeKey = key?.replace(/\//g, "__")?.replace(/:/g, "-");
        return `${keyPrefix}${safeKey}`;
    };
    const writeData = async (data, key) => {
        const redisKey = getRedisKey(key);
        await client.set(redisKey, JSON.stringify(data, BufferJSON.replacer));
        if (key.startsWith("app-state-sync-key")) {
            await onWrite(key, data);
        }
    };
    const readData = async (key) => {
        const data = await client.get(getRedisKey(key));
        if (!data)
            return null;
        return JSON.parse(data, BufferJSON.reviver);
    };
    const removeData = async (key) => {
        await client.del(getRedisKey(key));
    };
    const creds = (await readData("creds")) || initAuthCreds();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}`);
                        if (type === "app-state-sync-key" && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
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
export const saveMessage = async (msg, sessionPhone) => {
    const data = JSON.stringify(msg);
    const id = msg.key.id;
    const time = new Date().toISOString();
    if (isProd) {
        await db `INSERT INTO user_messages (id, session_phone, data, timestamp) VALUES (${id}, ${sessionPhone}, ${data}, ${time}) ON CONFLICT (id, session_phone) DO NOTHING`;
    }
    else {
        db.run("INSERT OR IGNORE INTO user_messages (id, session_phone, data, timestamp) VALUES (?, ?, ?, ?)", [id, sessionPhone, data, time]);
    }
};
export const saveContact = async (pn, lid, sessionPhone) => {
    if (!isPnUser(pn))
        return;
    if (isProd) {
        await db `INSERT INTO user_contacts (pn, session_phone, lid) VALUES (${pn}, ${sessionPhone}, ${lid}) ON CONFLICT (pn, session_phone) DO UPDATE SET lid = EXCLUDED.lid`;
    }
    else {
        db.run("INSERT OR REPLACE INTO user_contacts (pn, session_phone, lid) VALUES (?, ?, ?)", [pn, sessionPhone, lid]);
    }
};
export async function getMessage(key) {
    const id = key.id;
    let rawData;
    if (isProd) {
        const result = await db `SELECT data FROM user_messages WHERE id = ${id} LIMIT 1`;
        rawData = result[0]?.data;
    }
    else {
        const result = db
            .query("SELECT data FROM user_messages WHERE id = ? LIMIT 1")
            .get(id);
        rawData = result?.data;
    }
    if (rawData) {
        const msg = JSON.parse(rawData);
        return msg.message || undefined;
    }
    return undefined;
}
export function handleLidMapping(key, value, sessionPhone) {
    const isPn = !key.includes("reverse");
    const cleanedValue = value.replace(/^"|"$/g, "");
    if (isPn) {
        const pnKey = key.split("-")[2];
        if (pnKey)
            saveContact(`${pnKey}@s.whatsapp.net`, `${cleanedValue}@lid`, sessionPhone);
    }
    else {
        const keyPart = key.split("-")[2];
        const lidKey = keyPart?.split("_")[0];
        if (lidKey)
            saveContact(`${cleanedValue}@lid`, `${lidKey}@s.whatsapp.net`, sessionPhone);
    }
}
export async function cachedGroupMetadata(jid) {
    const id = jid;
    let raw;
    if (isProd) {
        raw =
            await db `SELECT metadata FROM group_metadata WHERE id = ${id} LIMIT 1`;
        raw = raw[0]?.metadata;
    }
    else {
        raw = db
            .query("SELECT metadata FROM group_metadata WHERE id = ?")
            .get(id);
        raw = raw?.metadata;
    }
    return raw ? JSON.parse(raw) : undefined;
}
export const cacheGroupMetadata = async (sessionPhone, metadata) => {
    const data = JSON.stringify(metadata);
    const now = new Date().toISOString();
    if (isProd) {
        await db `
      INSERT INTO group_metadata (id, session_phone, metadata, updated_at) 
      VALUES (${metadata.id}, ${sessionPhone}, ${data}, ${now}) 
      ON CONFLICT (id, session_phone) DO UPDATE SET metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at
    `;
    }
    else {
        db.run("INSERT OR REPLACE INTO group_metadata (id, session_phone, metadata, updated_at) VALUES (?, ?, ?, ?)", [metadata.id, sessionPhone, data, now]);
    }
};
export const isAdmin = async (chat, participantId) => {
    let raw;
    if (isProd) {
        raw = await db `
      SELECT metadata FROM group_metadata 
      WHERE id = ${chat} 
      LIMIT 1
    `;
        raw = raw[0]?.metadata;
    }
    else {
        const result = db
            .query("SELECT metadata FROM group_metadata WHERE id = ? LIMIT 1")
            .get(chat);
        raw = result?.metadata;
    }
    if (!raw)
        return false;
    const metadata = typeof raw === "string" ? JSON.parse(raw) : raw;
    const participant = metadata.participants.find((p) => p.id === participantId || p.phoneNumber === participantId);
    return !!participant?.admin;
};
export const syncGroupParticipantsToContactList = async (sessionPhone, metadata) => {
    const tasks = [];
    for (const participant of metadata.participants) {
        tasks.push(saveContact(participant.phoneNumber, participant.id, sessionPhone));
    }
    await Promise.all(tasks);
};
export const syncGroupMetadata = async (phone, sock) => {
    try {
        const groups = await sock.groupFetchAllParticipating();
        for (const jid in groups) {
            const metadata = groups[jid];
            await cacheGroupMetadata(phone, metadata);
            await syncGroupParticipantsToContactList(phone, metadata);
        }
    }
    catch (e) {
        console.error("Failed to sync groups and participants", e);
    }
};
export async function getAlternateId(id, sessionPhone) {
    const isLid = id?.endsWith("@lid");
    let result;
    if (isProd) {
        if (isLid) {
            result = await db `
        SELECT pn FROM user_contacts 
        WHERE lid = ${id} AND session_phone = ${sessionPhone} 
        LIMIT 1`;
            return result[0]?.pn;
        }
        else {
            result = await db `
        SELECT lid FROM user_contacts 
        WHERE pn = ${id} AND session_phone = ${sessionPhone} 
        LIMIT 1`;
            return result[0]?.lid;
        }
    }
    else {
        if (isLid) {
            result = db
                .query("SELECT pn FROM user_contacts WHERE lid = ? AND session_phone = ? LIMIT 1")
                .get(id, sessionPhone);
            return result?.pn;
        }
        else {
            result = db
                .query("SELECT lid FROM user_contacts WHERE pn = ? AND session_phone = ? LIMIT 1")
                .get(id, sessionPhone);
            return result?.lid;
        }
    }
}
