interface Command {
  pattern?: string;
  alias?: Array<string>;
  fromMe?: boolean;
  isGroup?: boolean;
  category?: CommandCategory;
  event?: boolean;
  function: (message: any, args?: string) => CommandExecution;
}

type CommandExecution = Promise<void> | Promise<unknown>;

type CommandCategory =
  | "p2p"
  | "group"
  | "newsletter"
  | "community"
  | "downloader"
  | "business"
  | "games"
  | "system";
