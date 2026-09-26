import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import nodemailer from "nodemailer";
import { z } from "zod";
import { rows, sql, db } from "./db";
import { ApiError, password } from "./domain";
export const hash = (v: string) => createHash("sha256").update(v).digest("hex");
const key = () => {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s || s.length < 32 || s === "GENERATE_SECRET")
    throw new Error(
      "Set JWT_ACCESS_SECRET to a random secret of at least 32 characters",
    );
  return new TextEncoder().encode(s);
};
export function ok(data: unknown = null, message = "Success", status = 200) {
  return NextResponse.json(
    { success: true, message, data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export function checkOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const allowed = process.env.APP_URL;
  if (!allowed) throw new Error("APP_URL is required");
  if (req.headers.get("origin") !== new URL(allowed).origin)
    throw new ApiError(403, "Request origin is not allowed", "ORIGIN_REJECTED");
}
export async function limit(keyValue: string, max = 12) {
  const k = hash(keyValue);
  await sql().execute(
    "INSERT INTO rate_limits(rate_key,attempts,expires_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE)) ON DUPLICATE KEY UPDATE attempts=IF(expires_at<UTC_TIMESTAMP(),1,attempts+1),expires_at=IF(expires_at<UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE),expires_at)",
    [k],
  );
  const [r] = await rows("SELECT attempts FROM rate_limits WHERE rate_key=?", [
    k,
  ]);
  if (r.attempts > max)
    throw new ApiError(
      429,
      "Too many attempts. Try again in 15 minutes.",
      "RATE_LIMITED",
    );
}
function cookie(
  res: NextResponse,
  name: string,
  value: string,
  maxAge?: number,
) {
  res.cookies.set(name, value, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    ...(maxAge === undefined ? {} : { maxAge }),
  });
}
async function session(res: NextResponse, user: any, remember: boolean) {
  const refresh = randomBytes(48).toString("hex");
  const token = await new SignJWT({ v: user.token_version, sid: hash(refresh) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("daybook")
    .setAudience("daybook-web")
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key());
  const seconds = (remember ? 30 : 1) * 86400;
  await sql().execute(
    "INSERT INTO refresh_tokens(token_hash,user_id,expires_at,token_version) VALUES (?,?,?,?)",
    [
      hash(refresh),
      user.id,
      new Date(Date.now() + seconds * 1000),
      user.token_version,
    ],
  );
  cookie(res, "access", token, 900);
  cookie(res, "refresh", refresh, remember ? seconds : undefined);
  return res;
}
export function publicUser(u: any) {
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
  };
}
export async function authenticate(req: NextRequest) {
  try {
    const token = req.cookies.get("access")?.value;
    if (!token) throw 0;
    const { payload } = await jwtVerify(token, key(), {
      issuer: "daybook",
      audience: "daybook-web",
      algorithms: ["HS256"],
    });
    const [u] = await rows("SELECT * FROM users WHERE id=? AND status=?", [
      payload.sub,
      "ACTIVE",
    ]);
    if (!u || u.token_version !== payload.v) throw 0;
    const [session] = await rows(
      "SELECT token_hash FROM refresh_tokens WHERE token_hash=? AND user_id=? AND revoked=FALSE AND expires_at>UTC_TIMESTAMP()",
      [payload.sid, u.id],
    );
    if (!session) throw 0;
    return u;
  } catch {
    throw new ApiError(401, "Please sign in again", "UNAUTHORIZED");
  }
}
const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
async function audit(
  req: NextRequest,
  email: string,
  userId: string | null,
  status: string,
) {
  await sql().execute(
    "INSERT INTO login_history(user_id,email,device,login_status) VALUES (?,?,?,?)",
    [
      userId,
      email,
      (req.headers.get("user-agent") ?? "Unknown").slice(0, 500),
      status,
    ],
  );
}
export async function sendMail(to: string, subject: string, text: string) {
  await nodemailer
    .createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: Number(process.env.SMTP_PORT) === 465,
      ...(process.env.SMTP_USER
        ? {
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          }
        : {}),
    })
    .sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
export async function authRoute(req: NextRequest, action: string) {
  if (action === "me" && req.method === "GET")
    return ok(publicUser(await authenticate(req)));
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");
  const body = await req.json();
  if (["register", "login", "forgot-password"].includes(action)) {
    const e = email.parse(body.email);
    await limit(`${action}:${e}`, action === "forgot-password" ? 5 : 12);
    if (action === "register") {
      const b = z
        .object({
          firstName: z.string().trim().min(1).max(100),
          lastName: z.string().trim().min(1).max(100),
          email,
          password,
          confirmPassword: z.string(),
        })
        .refine(
          (v) => v.password === v.confirmPassword,
          "Passwords do not match",
        )
        .parse(body);
      const id = randomUUID();
      try {
        await sql().execute(
          "INSERT INTO users(id,first_name,last_name,email,password_hash) VALUES (?,?,?,?,?)",
          [id, b.firstName, b.lastName, e, await bcrypt.hash(b.password, 12)],
        );
      } catch (err: any) {
        if (err.code === "ER_DUP_ENTRY")
          throw new ApiError(409, "This email is already registered");
        throw err;
      }
      await audit(req, e, id, "REGISTERED");
      return ok(null, "Account created. You can now sign in.", 201);
    }
    const [u] = await rows("SELECT * FROM users WHERE email=?", [e]);
    if (action === "login") {
      const valid = u
        ? await bcrypt.compare(
            z.string().max(72).parse(body.password),
            u.password_hash,
          )
        : await bcrypt.compare(
            String(body.password).slice(0, 72),
            "$2b$12$C6UzMDM.H6dfI/f/IKcEe.1PCfKggDPFqK/AIiTvkp78rw71Ks.K.",
          );
      if (!u || !valid || u.status !== "ACTIVE") {
        await audit(req, e, u?.id ?? null, "FAILED");
        throw new ApiError(401, "Invalid email or password");
      }
      await audit(req, e, u.id, "SUCCESS");
      await (await db()).collection("notifications").insertOne({
        userId: u.id,
        key: "security:" + randomUUID(),
        type: "security",
        message:
          "A successful sign-in to your account was recorded. Review Settings → Login history if this was not you.",
        read: false,
        createdAt: new Date(),
      });
      return session(ok(publicUser(u)), u, body.remember === true);
    }
    if (u && u.status === "ACTIVE") {
      const token = randomBytes(32).toString("hex");
      await sql().execute(
        "INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES (?,?,?)",
        [hash(token), u.id, new Date(Date.now() + 3600000)],
      );
      try {
        await sendMail(
          e,
          "Reset your Daybook password",
          `Reset your password within one hour: ${process.env.APP_URL}/reset-password?token=${token}\nIgnore this email if you did not request it.`,
        );
      } catch {
        console.error("Password reset email delivery failed");
      }
    }
    return ok(null, "If this account exists, a reset link has been sent.");
  }
  if (action === "refresh") {
    const token = req.cookies.get("refresh")?.value;
    if (!token) throw new ApiError(401, "Session expired");
    const conn = await sql().getConnection();
    try {
      await conn.beginTransaction();
      const [rs]: any = await conn.execute(
        "SELECT * FROM refresh_tokens WHERE token_hash=? AND revoked=FALSE AND expires_at>UTC_TIMESTAMP() FOR UPDATE",
        [hash(token)],
      );
      const r = rs[0];
      if (!r) throw new ApiError(401, "Session expired");
      const [users]: any = await conn.execute(
        "SELECT * FROM users WHERE id=? AND status=?",
        [r.user_id, "ACTIVE"],
      );
      if (!users[0] || users[0].token_version !== r.token_version)
        throw new ApiError(401, "Session expired");
      await conn.execute(
        "UPDATE refresh_tokens SET revoked=TRUE WHERE token_hash=?",
        [hash(token)],
      );
      await conn.commit();
      return session(
        ok(),
        users[0],
        new Date(r.expires_at).getTime() - Date.now() > 86400000,
      );
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
  if (action === "logout") {
    const token = req.cookies.get("refresh")?.value;
    if (token)
      await sql().execute(
        "UPDATE refresh_tokens SET revoked=TRUE WHERE token_hash=?",
        [hash(token)],
      );
    const res = ok();
    cookie(res, "access", "", 0);
    cookie(res, "refresh", "", 0);
    return res;
  }
  if (action === "reset-password") {
    const b = z
      .object({
        token: z.string().length(64),
        password,
        confirmPassword: z.string(),
      })
      .refine((v) => v.password === v.confirmPassword, "Passwords do not match")
      .parse(body);
    await limit("reset:" + hash(b.token));
    const passwordHash = await bcrypt.hash(b.password, 12);
    const conn = await sql().getConnection();
    try {
      await conn.beginTransaction();
      const [r]: any = await conn.execute(
        "SELECT * FROM password_reset_tokens WHERE token_hash=? AND used=FALSE AND expires_at>UTC_TIMESTAMP() FOR UPDATE",
        [hash(b.token)],
      );
      if (!r[0]) throw new ApiError(400, "Reset link is invalid or expired");
      await conn.execute(
        "UPDATE users SET password_hash=?,token_version=token_version+1 WHERE id=?",
        [passwordHash, r[0].user_id],
      );
      await conn.execute(
        "UPDATE password_reset_tokens SET used=TRUE WHERE user_id=?",
        [r[0].user_id],
      );
      await conn.execute(
        "UPDATE refresh_tokens SET revoked=TRUE WHERE user_id=?",
        [r[0].user_id],
      );
      await conn.commit();
      return ok(null, "Password reset. Please sign in.");
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
  const user = await authenticate(req);
  if (action === "logout-all" || action === "change-password") {
    if (action === "change-password") {
      const b = z
        .object({
          currentPassword: z.string().max(72),
          password,
          confirmPassword: z.string(),
        })
        .refine(
          (v) => v.password === v.confirmPassword,
          "Passwords do not match",
        )
        .parse(body);
      if (!(await bcrypt.compare(b.currentPassword, user.password_hash)))
        throw new ApiError(400, "Current password is incorrect");
      await sql().execute("UPDATE users SET password_hash=? WHERE id=?", [
        await bcrypt.hash(b.password, 12),
        user.id,
      ]);
    }
    await sql().execute(
      "UPDATE users SET token_version=token_version+1 WHERE id=?",
      [user.id],
    );
    await sql().execute(
      "UPDATE refresh_tokens SET revoked=TRUE WHERE user_id=?",
      [user.id],
    );
    const res = ok(null, "All sessions signed out");
    cookie(res, "access", "", 0);
    cookie(res, "refresh", "", 0);
    return res;
  }
  throw new ApiError(404, "Unknown authentication action");
}
