import {
  Session,
  Device,
  AuthToken,
  SessionContact,
  SessionMessage,
  SessionConfiguration,
  SessionGroup,
  Economy,
  initDb,
} from './models.mjs';

await initDb();

export const SessionStatus = {
  ACTIVE: 'active',
  CONNECTED: 'connected',
  PAUSED: 'paused',
  LOGGED_OUT: 'logged_out',
  PAIRING: 'pairing',
};

export const SessionManager = {
  async set(data) {
    await Session.upsert({
      id: data.id,
      status: data.status,
      name: data.name,
      profileUrl: data.profileUrl,
      isBusinessAccount: data.isBusinessAccount,
      createdAt: data.createdAt || new Date(),
    });
  },
  async get(id) {
    return await Session.findByPk(id);
  },
  async del(id) {
    await Session.destroy({ where: { id } });
  },
};

export const DevicesManager = {
  async set(data) {
    await Device.upsert({
      sessionId: data.sessionId,
      User: data.User || '',
      deviceInfo: data.deviceInfo,
      lastSeenAt: data.lastSeenAt || new Date(),
      createdAt: data.createdAt || new Date(),
    });
  },
  async get(sessionId) {
    return await Device.findOne({ where: { sessionId } });
  },
  async del(sessionId) {
    await Device.destroy({ where: { sessionId } });
  },
};

export const AuthTokenManager = {
  async set(data) {
    await AuthToken.upsert({
      sessionId: data.sessionId,
      token: data.token,
      value: data.value,
      createdAt: data.createdAt || new Date(),
    });
  },
  async get(sessionId) {
    return await AuthToken.findOne({ where: { sessionId } });
  },
  async del(sessionId) {
    await AuthToken.destroy({ where: { sessionId } });
  },
};

export const MessageManager = {
  async set(data) {
    await SessionMessage.upsert({
      sessionId: data.sessionId,
      messageId: data.messageId,
      messageContent: data.messageContent,
      createdAt: data.createdAt || new Date(),
    });
  },
  async get(sessionId) {
    const res = await SessionMessage.findAll({ where: { sessionId } });
    return res.length ? res : null;
  },
  async del(sessionId) {
    await SessionMessage.destroy({ where: { sessionId } });
  },
};

export const ContactManager = {
  async set(data) {
    await SessionContact.upsert({
      sessionId: data.sessionId,
      contactPn: data.contactPn,
      contactLid: data.contactLid,
      addedAt: data.addedAt || new Date(),
      createdAt: data.createdAt || new Date(),
    });
  },
  async get(sessionId) {
    const res = await SessionContact.findAll({ where: { sessionId } });
    return res.length ? res : null;
  },
  async del(sessionId, contactPn) {
    await SessionContact.destroy({
      where: { sessionId, contactPn },
    });
  },
};

export const ConfigManager = {
  async set(data) {
    await SessionConfiguration.upsert({
      sessionId: data.sessionId,
      configKey: data.configKey,
      configValue: data.configValue,
      createdAt: data.createdAt || new Date(),
    });
  },
  async get(sessionId) {
    return await SessionConfiguration.findByPk(sessionId);
  },
  async del(sessionId) {
    await SessionConfiguration.destroy({ where: { sessionId } });
  },
};

export const GroupManager = {
  async set(data) {
    await SessionGroup.upsert({
      groupId: data.groupId,
      sessionId: data.sessionId,
      groupInfo: data.groupInfo,
      updatedAt: data.updatedAt || new Date(),
      createdAt: data.createdAt || new Date(),
    });
  },
  async get(sessionId) {
    const res = await SessionGroup.findAll({ where: { sessionId } });
    return res.length ? res : null;
  },
  async del(groupId) {
    await SessionGroup.destroy({ where: { groupId } });
  },
};

export const EconomyManager = {
  async get(sessionId, userId) {
    const [eco] = await Economy.findOrCreate({
      where: { sessionId, userId },
      defaults: {
        sessionId,
        userId,
        balance: 5000,
        bank: 0
      }
    });
    return eco;
  },
  async update(sessionId, userId, data) {
    await Economy.update(data, { where: { sessionId, userId } });
  },
  async reset(sessionId, userId) {
    await Economy.destroy({ where: { sessionId, userId } });
  }
};

export * from './session.mjs';
export * from './contacts.mjs';
export * from './groups.mjs';
export * from './messages.mjs';
