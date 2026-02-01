import { Sequelize, DataTypes, Model } from 'sequelize';
import { resolve } from 'path';
import config from '../config.mjs';

const storage = resolve(config.DATABASE_URL.replace('sqlite://', ''));

export const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
    define: {
        timestamps: false,
        freezeTableName: true,
    },
    dialectOptions: {
        mode: 2,
    },
    pool: {
        max: 1,
        min: 1,
        idle: 10000,
    },
});

export class Session extends Model { }
Session.init(
    {
        id: { type: DataTypes.TEXT, primaryKey: true },
        status: { type: DataTypes.TEXT, allowNull: false },
        name: { type: DataTypes.TEXT },
        profileUrl: { type: DataTypes.TEXT },
        isBusinessAccount: { type: DataTypes.BOOLEAN, defaultValue: false },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'sessions' }
);


export class Device extends Model { }
Device.init(
    {
        sessionId: { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
        User: { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
        deviceInfo: { type: DataTypes.TEXT },
        lastSeenAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'devices' }
);


export class AuthToken extends Model { }
AuthToken.init(
    {
        sessionId: { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
        token: { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
        value: { type: DataTypes.TEXT, allowNull: false },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'auth_tokens' }
);


export class SessionContact extends Model { }
SessionContact.init(
    {
        sessionId: { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
        contactPn: { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
        contactLid: { type: DataTypes.TEXT },
        addedAt: { type: DataTypes.DATE, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
    },
    { sequelize, modelName: 'session_contacts' }
);


export class SessionMessage extends Model { }
SessionMessage.init(
    {
        sessionId: { type: DataTypes.TEXT, allowNull: false },
        messageId: { type: DataTypes.TEXT, primaryKey: true },
        messageContent: { type: DataTypes.TEXT },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'session_messages' }
);


export class SessionConfiguration extends Model { }
SessionConfiguration.init(
    {
        sessionId: { type: DataTypes.TEXT, primaryKey: true },
        configKey: { type: DataTypes.TEXT, allowNull: false },
        configValue: { type: DataTypes.TEXT },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'session_configurations' }
);


export class SessionGroup extends Model { }
SessionGroup.init(
    {
        groupId: { type: DataTypes.TEXT, primaryKey: true },
        sessionId: { type: DataTypes.TEXT, allowNull: false },
        groupInfo: { type: DataTypes.TEXT },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
    },
    { sequelize, modelName: 'session_groups' }
);


Session.hasMany(Device, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
Session.hasMany(AuthToken, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
Session.hasMany(SessionContact, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
Session.hasMany(SessionMessage, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
Session.hasOne(SessionConfiguration, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
Session.hasMany(SessionGroup, { foreignKey: 'sessionId', onDelete: 'CASCADE' });

Device.belongsTo(Session, { foreignKey: 'sessionId' });
AuthToken.belongsTo(Session, { foreignKey: 'sessionId' });
SessionContact.belongsTo(Session, { foreignKey: 'sessionId' });
SessionMessage.belongsTo(Session, { foreignKey: 'sessionId' });
SessionConfiguration.belongsTo(Session, { foreignKey: 'sessionId' });
SessionGroup.belongsTo(Session, { foreignKey: 'sessionId' });

export class Economy extends Model { }
Economy.init(
    {
        sessionId: { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
        userId: { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
        balance: { type: DataTypes.BIGINT, defaultValue: 5000 },
        bank: { type: DataTypes.BIGINT, defaultValue: 0 },
        lastDaily: { type: DataTypes.DATE },
        lastWork: { type: DataTypes.DATE },
        lastRob: { type: DataTypes.DATE },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'economy' }
);

Session.hasMany(Economy, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
Economy.belongsTo(Session, { foreignKey: 'sessionId' });

export async function initDb() {
    await sequelize.authenticate();

    await sequelize.query("PRAGMA journal_mode = WAL;");
    await sequelize.query("PRAGMA synchronous = OFF;");
    await sequelize.query("PRAGMA temp_store = MEMORY;");
    await sequelize.query("PRAGMA mmap_size = 268435456;");
    await sequelize.query("PRAGMA cache_size = -64000;");

    await sequelize.sync();
}
