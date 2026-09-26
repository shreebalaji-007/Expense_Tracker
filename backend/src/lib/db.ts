import mysql, { type RowDataPacket } from "mysql2/promise";
import { MongoClient } from "mongodb";
const g = globalThis as unknown as { sql?: mysql.Pool; mongo?: MongoClient };
export function sql() {
  return (g.sql ??= mysql.createPool({
    uri: process.env.MYSQL_DATABASE_URL!,
    connectionLimit: 10,
    timezone: "Z",
    decimalNumbers: true,
  }));
}
export async function rows<T = Record<string, any>>(
  query: string,
  params: any[] = [],
): Promise<T[]> {
  const [result] = await sql().execute<RowDataPacket[]>(query, params);
  return result as T[];
}
export async function db() {
  g.mongo ??= new MongoClient(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
  });
  return g.mongo.db();
}
export async function close() {
  await g.sql?.end();
  await g.mongo?.close();
}
export async function indexes() {
  const d = await db();
  for (const c of [
    "transactions",
    "categories",
    "accounts",
    "budgets",
    "recurring",
    "savings",
    "notifications",
    "attachments",
  ])
    await d.collection(c).createIndex({ userId: 1, deleted: 1 });
  await d
    .collection("categories")
    .createIndex(
      { userId: 1, name: 1, type: 1 },
      {
        unique: true,
        // partialFilterExpression: { deleted: { $exists: false } },
        partialFilterExpression: { deleted: null },
      },
    );
  await d
    .collection("budgets")
    .createIndex(
      { userId: 1, cycleKey: 1 },
      {
        unique: true,
        partialFilterExpression: { cycleKey: { $exists: true } },
      },
    );
  await d.collection("transactions").createIndex({ userId: 1, date: -1 });
  await d
    .collection("transactions")
    .createIndex({ occurrence: 1 }, { unique: true, sparse: true });
  await d
    .collection("notifications")
    .createIndex({ userId: 1, key: 1 }, { unique: true });
  await d
    .collection("preferences")
    .createIndex({ userId: 1 }, { unique: true });
  await d.collection("recurring").createIndex({ nextDate: 1, active: 1 });
}
