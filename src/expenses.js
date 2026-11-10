function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function addExpense(list, input) {
  if (!Array.isArray(list)) {
    throw new TypeError("Expenses must be an array.");
  }
  if (!input || typeof input !== "object") {
    throw new TypeError("Expense input must be an object.");
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  if (typeof input.category !== "string" || input.category.trim() === "") {
    throw new Error("Category is required.");
  }

  if (!isValidDate(input.date)) {
    throw new Error("Date must be a valid calendar date in YYYY-MM-DD format.");
  }
  if (input.note !== undefined && typeof input.note !== "string") {
    throw new Error("Note must be text.");
  }

  const nextId = list.reduce(
    (largest, expense) => Math.max(largest, Number.isInteger(expense.id) ? expense.id : 0),
    0,
  ) + 1;
  const expense = {
    id: nextId,
    amount,
    category: input.category.trim(),
    note: (input.note ?? "").trim(),
    date: input.date,
  };

  return [...list, expense];
}

export function listExpenses(list, filters = {}) {
  if (!Array.isArray(list)) {
    throw new TypeError("Expenses must be an array.");
  }
  if (filters.category !== undefined && typeof filters.category !== "string") {
    throw new Error("Category filter must be text.");
  }
  if (filters.month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month)) {
    throw new Error("Month must be in YYYY-MM format.");
  }

  return list.filter((expense) => {
    const matchesCategory =
      filters.category === undefined ||
      expense.category.toLowerCase() === filters.category.toLowerCase();
    const matchesMonth =
      filters.month === undefined || expense.date.startsWith(filters.month);
    return matchesCategory && matchesMonth;
  });
}
