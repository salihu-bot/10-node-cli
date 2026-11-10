import { listExpenses } from "./expenses.js";

const BAR_WIDTH = 30;

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(expenses) {
  if (!Array.isArray(expenses)) {
    throw new TypeError("Expenses must be an array.");
  }

  const headers = ["id", "amount", "category", "note", "date"];
  const rows = expenses.map((expense) =>
    headers.map((header) => escapeCsv(expense[header])).join(","),
  );
  return [headers.join(","), ...rows].join("\r\n") + "\r\n";
}

export function summarizeExpenses(expenses, { month, budget } = {}) {
  const matchingExpenses = listExpenses(expenses, month === undefined ? {} : { month });
  const categoryTotals = new Map();
  let total = 0;
  let biggest = null;

  for (const expense of matchingExpenses) {
    total += expense.amount;
    const category = categoryTotals.get(expense.category) ?? 0;
    categoryTotals.set(expense.category, category + expense.amount);
    if (biggest === null || expense.amount > biggest.amount) {
      biggest = expense;
    }
  }

  const largestCategoryTotal = [...categoryTotals.values()].reduce(
    (largest, amount) => Math.max(largest, amount),
    0,
  );
  const categories = [...categoryTotals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      bar: "█".repeat(
        largestCategoryTotal === 0
          ? 1
          : Math.max(1, Math.round((amount / largestCategoryTotal) * BAR_WIDTH)),
      ),
    }))
    .sort((left, right) => right.amount - left.amount || left.category.localeCompare(right.category));

  let budgetStatus = null;
  if (budget !== undefined && budget !== null) {
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error("Budget must be a positive number.");
    }
    if (total >= budget) {
      budgetStatus = "exceeded";
    } else if (total >= budget * 0.8) {
      budgetStatus = "warning";
    }
  }

  return { month: month ?? null, total, categories, biggest, budget: budget ?? null, budgetStatus };
}
