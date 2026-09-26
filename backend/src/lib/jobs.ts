import { db, rows } from "./db";
import { today, advanceDate } from "./domain";
import { preferences, notify, budgetNotifications } from "./finance";
export async function runJobs() {
  const d = await db();
  const users = await rows("SELECT id FROM users WHERE status=?", ["ACTIVE"]);
  let processed = 0;
  for (const u of users) {
    const p = await preferences(u.id),
      now = today(p.timezone);
    const rules = await d
      .collection("recurring")
      .find({ userId: u.id, deleted: { $ne: true }, active: true })
      .toArray();
    for (const rule of rules) {
      let next = rule.nextDate;
      let count = 0;
      try {
        while (
          next <= now &&
          (!rule.endDate || next <= rule.endDate) &&
          count++ < 366
        ) {
          const current = await d
            .collection("recurring")
            .findOne({
              _id: rule._id,
              userId: u.id,
              active: true,
              deleted: { $ne: true },
            });
          if (!current || current.nextDate !== next) break;
          const account = await d
            .collection("accounts")
            .findOne({
              userId: u.id,
              _id: new (await import("mongodb")).ObjectId(rule.accountId),
              deleted: { $ne: true },
              active: true,
            });
          const category = await d
            .collection("categories")
            .findOne({
              userId: u.id,
              _id: new (await import("mongodb")).ObjectId(rule.categoryId),
              type: rule.type,
              deleted: { $ne: true },
              active: true,
            });
          if (!account || !category)
            throw new Error("Account or category is inactive");
          const occurrence = `${rule._id}:${next}`;
          const {
            type,
            amountMinor,
            categoryId,
            accountId,
            paymentMethod,
            description,
            merchant,
            source,
            tags,
            notes,
          } = rule;
          try {
            const result = await d
              .collection("transactions")
              .updateOne(
                { occurrence, userId: u.id },
                {
                  $setOnInsert: {
                    occurrence,
                    userId: u.id,
                    type,
                    amountMinor,
                    categoryId,
                    accountId,
                    paymentMethod,
                    description,
                    merchant,
                    source,
                    tags,
                    notes,
                    date: next,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: u.id,
                    updatedBy: u.id,
                  },
                },
                { upsert: true },
              );
            processed += result.upsertedCount;
          } catch (e: any) {
            if (e.code !== 11000) throw e;
          }
          const following = advanceDate(
            next,
            rule.frequency,
            rule.intervalDays,
            rule.anchorDay,
          );
          await d
            .collection("recurring")
            .updateOne(
              { _id: rule._id, userId: u.id, nextDate: next },
              {
                $set: {
                  nextDate: following,
                  active: !rule.endDate || following <= rule.endDate,
                  lastRun: new Date(),
                  lastError: null,
                },
              },
            );
          next = following;
        }
        const soon = advanceDate(now, "CUSTOM", 3);
        if (
          p.recurringReminders &&
          next > now &&
          next <= soon &&
          (!rule.endDate || next <= rule.endDate)
        )
          await notify(
            u.id,
            `upcoming:${rule._id}:${next}`,
            `${rule.name} is due on ${next}.`,
            "recurring",
          );
      } catch (e) {
        await d
          .collection("recurring")
          .updateOne(
            { _id: rule._id, userId: u.id },
            {
              $set: {
                lastError: e instanceof Error ? e.message : "Processing failed",
              },
            },
          );
        await notify(
          u.id,
          `failed:${rule._id}:${next}`,
          `${rule.name} could not be processed. Check its account and category.`,
          "error",
        );
      }
    }
    // Create each following budget period as a separate record to preserve history.
    const budgets = await d
      .collection("budgets")
      .find({
        userId: u.id,
        deleted: { $ne: true },
        active: true,
        period: { $ne: "CUSTOM" },
        endDate: { $lt: now },
      })
      .toArray();
    for (const b of budgets) {
      const frequency = b.period;
      const start = advanceDate(b.endDate, "DAILY");
      const endExclusive = advanceDate(
        start,
        frequency,
        1,
        Number(b.startDate.slice(8)),
      );
      const ed = new Date(endExclusive + "T00:00:00Z");
      ed.setUTCDate(ed.getUTCDate() - 1);
      const cycleKey = `${b._id}:${start}`;
      const { _id, ...copy } = b;
      await d
        .collection("budgets")
        .updateOne(
          { userId: u.id, cycleKey },
          {
            $setOnInsert: {
              ...copy,
              cycleKey,
              startDate: start,
              endDate: ed.toISOString().slice(0, 10),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );
      await d
        .collection("budgets")
        .updateOne({ _id: b._id, userId: u.id }, { $set: { active: false } });
    }
    await budgetNotifications(u.id);
    if (p.monthlyReports && Number(now.slice(8)) <= 3) {
      const lastMonth = new Date(now.slice(0, 7) + "-01T00:00:00Z");
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      const month = lastMonth.toISOString().slice(0, 7);
      await notify(
        u.id,
        `report:${month}`,
        `Your ${month} monthly report is available in Reports.`,
        "report",
      );
    }
  }
  return { processed };
}
