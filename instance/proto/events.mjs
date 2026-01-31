/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal.js";

const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const whatsaly = $root.whatsaly = (() => {

    const whatsaly = {};

    whatsaly.ConnectionUpdate = (function () {

        function ConnectionUpdate(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        ConnectionUpdate.prototype.phone = "";
        ConnectionUpdate.prototype.status = "";
        ConnectionUpdate.prototype.qr = "";
        ConnectionUpdate.prototype.pairingCode = "";

        ConnectionUpdate.create = function create(properties) {
            return new ConnectionUpdate(properties);
        };

        ConnectionUpdate.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                writer.uint32(10).string(message.phone);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                writer.uint32(18).string(message.status);
            if (message.qr != null && Object.hasOwnProperty.call(message, "qr"))
                writer.uint32(26).string(message.qr);
            if (message.pairingCode != null && Object.hasOwnProperty.call(message, "pairingCode"))
                writer.uint32(34).string(message.pairingCode);
            return writer;
        };

        ConnectionUpdate.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new ConnectionUpdate();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1:
                        message.phone = reader.string();
                        break;
                    case 2:
                        message.status = reader.string();
                        break;
                    case 3:
                        message.qr = reader.string();
                        break;
                    case 4:
                        message.pairingCode = reader.string();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        };

        return ConnectionUpdate;
    })();

    whatsaly.WorkerEvent = (function () {

        function WorkerEvent(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        WorkerEvent.prototype.connection = null;
        WorkerEvent.prototype.rawLog = "";

        let $oneOfFields;

        Object.defineProperty(WorkerEvent.prototype, "event", {
            get: $util.oneOfGetter($oneOfFields = ["connection", "rawLog"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        WorkerEvent.create = function create(properties) {
            return new WorkerEvent(properties);
        };

        WorkerEvent.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.connection != null && Object.hasOwnProperty.call(message, "connection"))
                whatsaly.ConnectionUpdate.encode(message.connection, writer.uint32(10).fork()).ldelim();
            if (message.rawLog != null && Object.hasOwnProperty.call(message, "rawLog"))
                writer.uint32(18).string(message.rawLog);
            return writer;
        };

        WorkerEvent.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new WorkerEvent();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1:
                        message.connection = whatsaly.ConnectionUpdate.decode(reader, reader.uint32());
                        break;
                    case 2:
                        message.rawLog = reader.string();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        };

        return WorkerEvent;
    })();

    return whatsaly;
})();

export { $root as default };
