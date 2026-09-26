import "dotenv/config";
import { sql, close } from "../src/lib/db";
const email = process.argv[2]?.toLowerCase();
if (!email)
  throw new Error("Usage: npm run admin -w backend -- email@example.com");
try {
  const [r] = await sql().execute("UPDATE users SET role=? WHERE email=?", [
    "ADMIN",
    email,
  ]);
  console.log(r);
} finally {
  await close();
}
