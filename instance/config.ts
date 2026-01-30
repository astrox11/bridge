import { existsSync, writeFileSync } from "fs";
import { config } from "dotenv";

((s = ".env", c = "DATABASE_URL=database.db") =>
  !existsSync(s) && writeFileSync(s, c))();

config({ debug: true, quiet: true });

export default {
  PORT: process.env.PORT || "8080",
  DATABASE_URL: process.env.DATABASE_URL || "database.db",
};
