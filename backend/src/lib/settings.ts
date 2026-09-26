import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, rows, sql } from "./db";
import { ApiError, id } from "./domain";
import { ok, publicUser } from "./auth";
import { preferences, serialize, defaults } from "./finance";
export async function settings(req: NextRequest, u: any, action?: string) {
  if (action === "login-history" && req.method === "GET")
    return ok(
      await rows(
        "SELECT device,login_status,login_time FROM login_history WHERE user_id=? ORDER BY login_time DESC LIMIT 100",
        [u.id],
      ),
    );
  if (req.method === "GET")
    return ok({
      user: publicUser(u),
      preferences: serialize(await preferences(u.id)),
    });
  if (req.method !== "PUT") throw new ApiError(405, "Method not allowed");
  const b = z
    .object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      email: z
        .string()
        .email()
        .max(254)
        .transform((s) => s.toLowerCase()),
      currentPassword: z.string().max(72).optional(),
      phone: z.string().max(30),
      currency: z.enum(["INR", "USD", "EUR", "GBP", "JPY"]),
      timezone: z.string().refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Invalid timezone"),
      country: z.string().max(100),
      dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
      theme: z.enum(["light", "dark", "system"]),
      language: z.literal("en"),
      emailNotifications: z.boolean(),
      budgetAlerts: z.boolean(),
      recurringReminders: z.boolean(),
      monthlyReports: z.boolean(),
      photoId: id.nullable().optional(),
    })
    .parse(await req.json());
  const d = await db();
  const old = await preferences(u.id);
  if (
    b.currency !== old.currency &&
    (await d
      .collection("accounts")
      .countDocuments({ userId: u.id, deleted: { $ne: true } }))
  )
    throw new ApiError(
      409,
      "Currency cannot change while financial accounts exist.",
    );
  if (b.photoId) {
    const photo = await d
      .collection("attachments")
      .findOne({ _id: new ObjectId(b.photoId), userId: u.id });
    if (!photo || !photo.mime.startsWith("image/"))
      throw new ApiError(422, "Select an uploaded profile image");
  }
  if (
    b.email !== u.email &&
    (!b.currentPassword ||
      !(await bcrypt.compare(b.currentPassword, u.password_hash)))
  )
    throw new ApiError(400, "Enter your current password to change email");
  try {
    await sql().execute(
      "UPDATE users SET first_name=?,last_name=?,email=?,phone=? WHERE id=?",
      [b.firstName, b.lastName, b.email, b.phone, u.id],
    );
  } catch (e: any) {
    if (e.code === "ER_DUP_ENTRY")
      throw new ApiError(409, "Email already in use");
    throw e;
  }
  const { firstName, lastName, email, phone, currentPassword, ...prefs } = b;
  await d
    .collection("preferences")
    .updateOne(
      { userId: u.id },
      { $set: { ...prefs, updatedAt: new Date() } },
      { upsert: true },
    );
  return ok(null, "Settings saved");
}
export async function attachments(
  req: NextRequest,
  userId: string,
  recordId?: string,
) {
  const d = await db();
  if (req.method === "GET" && recordId) {
    const a = await d
      .collection("attachments")
      .findOne({ _id: new ObjectId(id.parse(recordId)), userId });
    if (!a) throw new ApiError(404, "Attachment not found");
    return new NextResponse(new Uint8Array(a.data.buffer), {
      headers: {
        "Content-Type": a.mime,
        "Content-Disposition": `inline; filename="${a.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");
  const length = Number(req.headers.get("content-length"));
  if (length > 6 * 1024 * 1024)
    throw new ApiError(413, "Maximum upload size is 5 MB");
  const form = await req.formData(),
    file = form.get("file");
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || file.size === 0)
    throw new ApiError(422, "Choose a PNG, JPEG, WebP or PDF file up to 5 MB");
  const buffer = Buffer.from(await file.arrayBuffer());
  let mime = "";
  if (buffer.subarray(0, 5).toString() === "%PDF-") mime = "application/pdf";
  else if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    mime = "image/png";
  else if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    mime = "image/jpeg";
  else if (
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  )
    mime = "image/webp";
  if (!mime) throw new ApiError(422, "Unsupported file content");
  const [used] = await d
    .collection("attachments")
    .aggregate([
      { $match: { userId } },
      { $group: { _id: null, size: { $sum: "size" } } },
    ])
    .toArray();
  if ((used?.size ?? 0) + file.size > 100 * 1024 * 1024)
    throw new ApiError(413, "Your 100 MB upload limit has been reached");
  const r = await d
    .collection("attachments")
    .insertOne({
      userId,
      name: file.name.slice(0, 200),
      mime,
      size: file.size,
      data: buffer,
      createdAt: new Date(),
    });
  return ok(
    { _id: r.insertedId.toHexString(), name: file.name },
    "Uploaded",
    201,
  );
}
export async function admin(
  req: NextRequest,
  u: any,
  part?: string,
  recordId?: string,
) {
  if (u.role !== "ADMIN")
    throw new ApiError(403, "Administrator access required");
  const d = await db();
  if (part === "users" && req.method === "GET")
    return ok(
      await rows(
        "SELECT id,first_name,last_name,email,role,status,created_at FROM users ORDER BY created_at DESC LIMIT 1000",
      ),
    );
  if (part === "users" && req.method === "PUT") {
    if (recordId === u.id)
      throw new ApiError(400, "You cannot deactivate yourself");
    const b = z
      .object({ status: z.enum(["ACTIVE", "INACTIVE"]) })
      .parse(await req.json());
    const [r]: any = await sql().execute(
      "UPDATE users SET status=?,token_version=token_version+1 WHERE id=?",
      [b.status, z.string().uuid().parse(recordId)],
    );
    if (!r.affectedRows) throw new ApiError(404, "User not found");
    await sql().execute(
      "UPDATE refresh_tokens SET revoked=TRUE WHERE user_id=?",
      [recordId!],
    );
    return ok();
  }
  if (part === "audit" && req.method === "GET")
    return ok(
      await rows(
        "SELECT email,device,login_status,login_time FROM login_history ORDER BY login_time DESC LIMIT 500",
      ),
    );
  if (part === "stats" && req.method === "GET") {
    const [users] = await rows(
      'SELECT COUNT(*) AS totalUsers,SUM(status="ACTIVE") AS activeUsers FROM users',
    );
    return ok({
      ...users,
      transactions: await d.collection("transactions").estimatedDocumentCount(),
      accounts: await d.collection("accounts").estimatedDocumentCount(),
    });
  }
  if (part === "config") {
    if (req.method === "GET")
      return ok(
        serialize(
          (await d.collection("config").findOne({ key: "defaults" })) ?? {
            categories: Object.entries(defaults).flatMap(([type, names]) =>
              names.map((name) => ({ name, type })),
            ),
            registrationEnabled: true,
          },
        ),
      );
    if (req.method === "PUT") {
      const b = z
        .object({
          registrationEnabled: z.boolean(),
          categories: z
            .array(
              z.object({
                name: z.string().trim().min(1).max(100),
                type: z.enum(["EXPENSE", "INCOME"]),
              }),
            )
            .min(2)
            .max(100),
        })
        .parse(await req.json());
      await d
        .collection("config")
        .updateOne(
          { key: "defaults" },
          { $set: { ...b, updatedAt: new Date() } },
          { upsert: true },
        );
      return ok();
    }
  }
  throw new ApiError(404, "Admin endpoint not found");
}
