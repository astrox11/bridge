import { type WASocket } from "baileys";
import type { Message } from "./Message";
import { readdirSync } from "fs";
import { join, resolve } from "path";
import { log } from "../debug";
import { pathToFileURL } from "url";

export class Plugins {
  message: Message;
  client: WASocket;
  private static commands: Map<string, CommandProperty> = new Map();

  constructor(message: Message, client: WASocket) {
    this.message = message;
    this.client = client;
  }

  async text() {
    if (this.message && this.message?.text) {
      const text = this.message.text.replace(/^\s+|\s+$/g, "");
      const cmd = this.find(text);
      if (cmd) {
        try {
          await cmd.exec(this.message, this.client);
        } catch (error) {
          log.error("[text] CMD ERROR:", error);
        }
      }
    }
  }

  async sticker() {
    // Implement for sticker based trigger
  }

  async load(pluginsFolder: string) {
    const files = readdirSync(pluginsFolder).filter(
      (file) => file.endsWith(".js") || file.endsWith(".ts"),
    );

    for (const file of files) {
      try {
        const filePath = resolve(join(pluginsFolder, file));
        const fileUrl = pathToFileURL(filePath).href;
        const imported = await import(fileUrl);
        const commandData = imported.default;

        if (Array.isArray(commandData)) {
          for (const cmd of commandData) {
            this.registerCommand(cmd);
          }
        } else {
          this.registerCommand(commandData);
        }
      } catch (error) {
        log.error(`Failed to load plugin ${file}:`, error);
      }
    }
  }

  private registerCommand(cmd: CommandProperty) {
    // Register by pattern
    Plugins.commands.set(cmd.pattern.toLowerCase(), cmd);

    // Register by aliases
    if (cmd.alias) {
      for (const alias of cmd.alias) {
        Plugins.commands.set(alias.toLowerCase(), cmd);
      }
    }
  }

  find(patternOrAlias: string): CommandProperty | undefined {
    return Plugins.commands.get(patternOrAlias.toLowerCase());
  }

  findAll(): CommandProperty[] {
    const unique = new Map<string, CommandProperty>();

    for (const cmd of Plugins.commands.values()) {
      unique.set(cmd.pattern, cmd);
    }

    return Array.from(unique.values());
  }
}

export interface CommandProperty {
  pattern: string;
  alias?: Array<string>;
  desc?: string;
  category: CommandCategories;
  exec: (msg: Message, sock?: WASocket) => Promise<any>;
}

type CommandCategories = "p2p" | "groups" | "newsletter" | "status" | "util";
