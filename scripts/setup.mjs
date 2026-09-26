import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
if (!existsSync(".env")) {
  const password = randomBytes(24).toString("hex");
  writeFileSync(
    ".env",
    readFileSync(".env.example", "utf8")
      .replaceAll("DATABASE_PASSWORD", password)
      .replaceAll("GENERATE_SECRET", () => randomBytes(32).toString("hex")),
  );
}
if (!existsSync("backend/.env")) copyFileSync(".env", "backend/.env");
console.log(
  "Environment files ready. See README.md for Docker or local startup.",
);
