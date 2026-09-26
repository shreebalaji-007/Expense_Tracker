import { ApiError } from "./domain";

type Dashboard = {
  income: number;
  expense: number;
  savings: number;
  monthExpense: number;
  remainingBudget: number;
  categories: { name: string; expense: number }[];
  budgets: { name: string; amount: number; spent: number; remaining: number; percent: number }[];
};

/** Creates advice from aggregates only; raw transactions and account data never leave the app. */
export async function spendingInsight(summary: Dashboard, currency: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw new ApiError(503, "AI insights are not configured. Add OPENAI_API_KEY to your server environment.", "AI_NOT_CONFIGURED");

  const snapshot = {
    currency, income: summary.income, expenses: summary.expense, savings: summary.savings,
    currentMonthExpenses: summary.monthExpense, remainingActiveBudget: summary.remainingBudget,
    topExpenseCategories: summary.categories.sort((a, b) => b.expense - a.expense).slice(0, 5),
    budgets: summary.budgets.slice(0, 5).map((b) => ({ name: b.name, amount: b.amount, spent: b.spent, remaining: b.remaining, percentUsed: b.percent })),
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5-mini", store: false,
      instructions: "You are a cautious personal-finance coach. Give 2-3 concise, practical observations based only on the supplied aggregate data. Do not give investment, tax, legal, credit, or debt-management advice. Do not invent facts. State that it is general information, not financial advice, in the final sentence.",
      input: JSON.stringify(snapshot), max_output_tokens: 260,
    }),
  });
  if (!response.ok) {
    console.error("OpenAI insight request failed", response.status);
    throw new ApiError(502, "AI insights are temporarily unavailable.", "AI_UNAVAILABLE");
  }
  const insight = ((await response.json()) as { output_text?: string }).output_text?.trim();
  if (!insight) throw new ApiError(502, "AI returned an empty insight. Please try again.", "AI_EMPTY_RESPONSE");
  return { insight, generatedAt: new Date().toISOString() };
}
