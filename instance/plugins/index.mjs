import { join, isAbsolute } from "path";
import { readdirSync } from "fs";
import { cwd } from "process";
import { pathToFileURL } from "url";

export const commands = new Map();

export const loadPlugins = async (
  directory = join(cwd(), "plugins"),
) => {
  try {
    const files = readdirSync(directory)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
      .filter((file) => !file.startsWith("index."));

    for (const file of files) {
      try {
        const absolutePath = isAbsolute(file) ? file : join(directory, file);
        const fileUrl = pathToFileURL(absolutePath).href;
        const module = await import(fileUrl);
        const commandData = module.default || module;

        if (Array.isArray(commandData)) {
          commandData.forEach(addCommandToMap);
        } else if (commandData) {
          addCommandToMap(commandData);
        }
      } catch (e) {
        console.error(`Failed to load plugin: ${file}`, e);
      }
    }
  } catch (dirError) {
    console.error(`Could not read directory: ${directory}`, dirError);
  }
};

const addCommandToMap = (cmd) => {
  if (cmd.pattern) {
    commands.set(cmd.pattern.trim(), cmd);
  }

  if (cmd.alias) {
    cmd.alias.forEach((a) => commands.set(a.trim(), cmd));
  }

  if (cmd.event && !cmd.pattern) {
    const eventKey = `event_${cmd.function.name || Math.random().toString(36).slice(2, 9)
      }`;
    commands.set(eventKey, cmd);
  }
};

export const findCommand = (name) => {
  return commands.get(name.trim());
};

export const getAllCommands = () => {
  return Array.from(new Set(commands.values()));
};

export const getAllEvents = () => {
  return getAllCommands().filter((cmd) => cmd?.event === true);
};
