import { WebSocket } from "ws";

const wsListener = WebSocket.prototype.on || WebSocket.prototype.addListener;
const mockEvent = (event: string) =>
  event === "upgrade" || event === "unexpected-response";

if (wsListener) {
  const patch = function (this: any, event: string, listener: any) {
    if (mockEvent(event)) return this;
    return wsListener.call(this, event, listener);
  };
  if (WebSocket.prototype.on) WebSocket.prototype.on = patch;
  if (WebSocket.prototype.addListener) WebSocket.prototype.addListener = patch;
}

import { log, sessionManager } from "./lib";
import {
  isSessionCommand,
  getSessionArgs,
  handleSessionCommand,
  SESSION_COMMANDS,
} from "./cli";

/**
 * Main entry point
 */
const main = async () => {
  const args = process.argv.slice(2);

  if (isSessionCommand(args)) {
    const sessionArgs = getSessionArgs(args);
    const result = await handleSessionCommand(sessionArgs);

    if (result.success) {
      log.info(result.message);
    } else {
      log.error(result.message);
      process.exit(1);
    }

    if (
      sessionArgs[0]?.toLowerCase() === SESSION_COMMANDS.CREATE &&
      result.success
    ) {
      log.info("Waiting for pairing to complete...");
      return;
    }

    process.exit(0);
  }

  const sessions = sessionManager.list();

  if (sessions.length === 0) {
    log.info("No sessions found in database.");
    log.info("Use 'session create <phone_number>' to create a new session.");
    log.info("Example: bun start session create 14155551234");
    return;
  }

  log.info(`Found ${sessions.length} session(s), starting all...`);
  await sessionManager.restoreAllSessions();
  log.info("All sessions started. Running in multi-session mode.");
};

main();
