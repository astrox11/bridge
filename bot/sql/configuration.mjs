import { ConfigManager } from "./index.mjs";
import { update_config } from "../pkg/util";

export class Configuration {
  constructor(sessionId) {
    this.sessionId = sessionId;
  }

  async get(key) {
    const record = await ConfigManager.get(this.sessionId, key);
    return record ? record.configValue : null;
  }

  async set(key, value) {
    await ConfigManager.set({
      sessionId: this.sessionId,
      configKey: key,
      configValue: value,
    });
  }

  async syncToWasm() {
    const prefixes = await this.getPrefix();
    const mode = await this.getMode();
    const sudo = await this.getSudo();

    try {
      update_config({
        prefixes,
        mode,
        sudo,
      });
    } catch (e) {
      console.error("[CONFIG] Failed to sync to WASM:", e);
    }
  }

  /**
   * Prefix: string or null
   * Returns: array of characters
   */
  async getPrefix() {
    const val = await this.get("prefix");
    // Default is null (or whatever implies no prefix? User said string or null)
    if (!val) return [];
    return val.split("");
  }

  async setPrefix(val) {
    if (val === null) {
      await this.set("prefix", null);
    } else {
      await this.set("prefix", String(val));
    }
    await this.syncToWasm();
  }

  /**
   * Sudo: array of ids
   * Returns: array of ids
   */
  async getSudo() {
    const val = await this.get("sudo");
    if (!val) return [];
    try {
      return JSON.parse(val);
    } catch {
      // If not valid JSON, maybe it's a comma separated string? User said "takes string".
      // Let's assume it might be simple string
      return [val];
    }
  }

  async setSudo(val) {
    let toStore;
    if (Array.isArray(val)) {
      toStore = JSON.stringify(val);
    } else {
      // If string, wrap in array or parse? User said "takes string... return array of ids"
      // Maybe user means comma separated input?
      // Or just a single ID?
      // Verification: "sudo takes array, and return array of ids"
      // User *also* said "sudo, it takes string" earlier.
      // I'll assume if string is passed, it's one ID, or comma split.
      // Let's being robust:
      if (typeof val === "string") {
        // Check if it looks like JSON array
        if (val.startsWith("[")) {
          toStore = val; // TRUST
        } else {
          toStore = JSON.stringify([val]);
        }
      } else {
        toStore = JSON.stringify([]);
      }
    }
    await this.set("sudo", toStore);
    await this.syncToWasm();
  }

  async addSudo(id) {
    const current = await this.getSudo();
    if (!current.includes(id)) {
      current.push(id);
      await this.setSudo(current);
      // setSudo calls syncToWasm, so we don't need to call it here explicitly again,
      // but to be safe and explicit or if setSudo implementation changes:
      // Actually setSudo calls it.
    }
  }

  /**
   * Mode: public | private
   * Default: public?
   */
  async getMode() {
    const val = await this.get("mode");
    return val || "public"; // Default
  }

  async setMode(val) {
    if (val !== "public" && val !== "private") {
      throw new Error("Invalid mode. Must be public or private");
    }
    await this.set("mode", val);
    await this.syncToWasm();
  }
}
