import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { authRoute, authenticate, checkOrigin, ok } from "../../../lib/auth";
import { ApiError, schemas, id } from "../../../lib/domain";
import { spendingInsight } from "../../../lib/ai";
import { db, rows } from "../../../lib/db";
import {
  bootstrap,
  transactions,
  resources,
  dashboard,
  reportData,
  serialize,
  preferences,
} from "../../../lib/finance";
import { settings, attachments, admin } from "../../../lib/settings";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    checkOrigin(req);
    const [part, action, recordId] = (await params).path;
    if (part === "health" && req.method === "GET") {
      await rows("SELECT 1");
      await (await db()).command({ ping: 1 });
      return ok({ status: "healthy" });
    }
    if (part === "auth") {
      if (
        action === "register" &&
        (await (await db()).collection("config").findOne({ key: "defaults" }))
          ?.registrationEnabled === false
      )
        throw new ApiError(403, "Registration is currently disabled");
      return await authRoute(req, action);
    }
    const u = await authenticate(req);
    if (part === "bootstrap" && req.method === "POST")
      return await bootstrap(u.id);
    if (["expenses", "income", "transactions"].includes(part))
      return await transactions(
        req,
        u.id,
        action,
        part === "expenses"
          ? "EXPENSE"
          : part === "income"
            ? "INCOME"
            : undefined,
      );
    if (Object.hasOwn(schemas, part))
      return await resources(req, u.id, part as keyof typeof schemas, action);
    if (part === "dashboard" && req.method === "GET") {
      const result = await dashboard(u.id, req.nextUrl.searchParams);
      const map: Record<string, unknown> = {
        "income-expense": result.monthly,
        "category-expenses": result.categories,
        "spending-trend": result.trend,
        "budget-summary": result.budgets,
      };
      return ok(map[action] ?? result);
    }
    if (part === "ai" && action === "insights" && req.method === "GET") {
      const [summary, prefs] = await Promise.all([
        dashboard(u.id, req.nextUrl.searchParams), preferences(u.id),
      ]);
      return ok(await spendingInsight(summary, prefs.currency));
    }
    if (part === "reports" && req.method === "GET") {
      if (action === "budget") {
        const result = await resources(req, u.id, "budgets");
        return result;
      }
      const q = new URLSearchParams(req.nextUrl.searchParams);
      if (action === "income") q.set("type", "INCOME");
      if (action === "expense") q.set("type", "EXPENSE");
      return ok(await reportData(u.id, q, action));
    }
    if (part === "settings") return await settings(req, u, action);
    if (part === "attachments") return await attachments(req, u.id, action);
    if (part === "admin") return await admin(req, u, action, recordId);
    if (part === "notifications") {
      const c = (await db()).collection("notifications");
      if (req.method === "GET")
        return ok(
          serialize(
            await c
              .find({ userId: u.id })
              .sort({ createdAt: -1 })
              .limit(100)
              .toArray(),
          ),
        );
      if (req.method === "PUT") {
        await c.updateMany(
          {
            userId: u.id,
            ...(action && action !== "read-all"
              ? { _id: new ObjectId(id.parse(action)) }
              : {}),
          },
          { $set: { read: true } },
        );
        return ok();
      }
    }
    throw new ApiError(404, "Endpoint not found");
  } catch (e: any) {
    if (e instanceof ApiError)
      return NextResponse.json(
        { success: false, message: e.message, errorCode: e.code },
        { status: e.status },
      );
    if (e instanceof z.ZodError)
      return NextResponse.json(
        {
          success: false,
          message: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
          errorCode: "VALIDATION_ERROR",
        },
        { status: 422 },
      );
    if (e?.code === 11000)
      return NextResponse.json(
        {
          success: false,
          message: "A matching record already exists",
          errorCode: "DUPLICATE_RECORD",
        },
        { status: 409 },
      );
    if (e instanceof SyntaxError)
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request",
          errorCode: "INVALID_JSON",
        },
        { status: 400 },
      );
    console.error("API request failed", e?.code ?? e?.name ?? "UnknownError");
    return NextResponse.json(
      {
        success: false,
        message: "The service is unavailable. Please try again.",
        errorCode: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
