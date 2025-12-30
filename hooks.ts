import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Build baileys
try {
  execSync("npm run build", {
    cwd: path.join("node_modules", "baileys"),
    stdio: "ignore",
  });
} catch {
  /* */
}

// Patch libsignal
try {
  const target = path.join(
    "node_modules",
    "libsignal",
    "src",
    "session_record.js",
  );
  const content = fs.readFileSync(target, "utf8");
  fs.writeFileSync(
    target,
    content
      .split("\n")
      .filter(
        (line) => !line.includes('console.info("Closing session:", session)'),
      )
      .join("\n"),
    "utf8",
  );
} catch {
  /** */
}

// Build service frontend
try {
  const astroPath = path.join(process.cwd(), "service");
  if (fs.existsSync(astroPath)) {
    console.log("Installing service dependencies...");
    execSync("bun install", {
      cwd: astroPath,
      stdio: "inherit",
    });
    console.log("Building service...");
    execSync("bun run build", {
      cwd: astroPath,
      stdio: "inherit",
    });
    console.log("service build complete.");
  }
} catch (error) {
  console.error("Failed to build service:", error);
}
