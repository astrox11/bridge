import fs from "fs";
import path from "path";

function clean() {
  const target = path.join(
    "node_modules",
    "libsignal",
    "src",
    "session_record.js"
  );

  if (!fs.existsSync(target)) {
    console.error("Target file not found:", target);
    return;
  }

  const content = fs.readFileSync(target, "utf8");
  const lines = content.split("\n");

  const filtered = lines.filter(
    line => !line.includes('console.info("Closing session:", session)')
  );

  fs.writeFileSync(target, filtered.join("\n"), "utf8");
}

clean();
