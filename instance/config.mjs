import { config } from "dotenv";
import { join } from "path";

const env = join(process.cwd(), "..", ".env");

config({ debug: false });

config({ path: env, debug: false });

export default {
  PORT: process.env.PORT || "8080",
  DATABASE_URL: process.env.DATABASE_URL || "../database.db",
};
