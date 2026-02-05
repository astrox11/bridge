import { config } from "dotenv";
import { join } from "path";

const env = join(process.cwd(), "..", ".env");

config({ path: env, quiet: true });

export default {
  PORT: process.env.PORT || "8080",
  DATABASE_URL: process.env.DATABASE_URL || "../database.db",
  BOT_NAME: process.env.BOT_NAME || "Whatsaly",
};
