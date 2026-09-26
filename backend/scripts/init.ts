import "dotenv/config";
import { readFileSync } from "node:fs";
import { sql, indexes, close } from "../src/lib/db";
const schema = readFileSync(
  new URL("../../databases/mysql.sql", import.meta.url),
  "utf8",
);
try {
  for (const statement of schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await sql().query(statement);
  await indexes();
  console.log("MySQL schema and MongoDB indexes ready.");
} finally {
  await close();
}
